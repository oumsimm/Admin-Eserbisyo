import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc,
  doc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { 
  AlertTriangle as AlertIcon,
  Clock as ClockIcon,
  User as UserIcon,
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Search as SearchIcon,
  Eye as EyeIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  RefreshCw as RefreshIcon,
  Download as DownloadIcon,
  AlertCircle as AlertCircleIcon,
  Zap as ZapIcon
} from 'lucide-react';

export default function UserReports() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency_date');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    resolved: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for user reports
    const reportsQuery = query(
      collection(db, 'userReports'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      setReports(reportsData);
      updateStats(reportsData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    filterAndSortReports();
  }, [reports, searchTerm, urgencyFilter, statusFilter, categoryFilter, sortBy]);

  const updateStats = (reportsData) => {
    const stats = {
      total: reportsData.length,
      critical: reportsData.filter(r => r.urgency === 'critical').length,
      high: reportsData.filter(r => r.urgency === 'high').length,
      medium: reportsData.filter(r => r.urgency === 'medium').length,
      low: reportsData.filter(r => r.urgency === 'low').length,
      pending: reportsData.filter(r => r.status === 'pending').length,
      resolved: reportsData.filter(r => r.status === 'resolved').length
    };
    setStats(stats);
  };

  const filterAndSortReports = () => {
    let filtered = reports.filter(report => {
      const matchesSearch = 
        report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reporterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reporterEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUrgency = urgencyFilter === 'all' || report.urgency === urgencyFilter;
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
      
      return matchesSearch && matchesUrgency && matchesStatus && matchesCategory;
    });

    // Sort reports
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'urgency_date':
          // First by urgency priority, then by date
          const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const urgencyDiff = (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
          if (urgencyDiff !== 0) return urgencyDiff;
          return new Date(b.createdAt) - new Date(a.createdAt);
        
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        
        case 'urgency':
          const urgOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (urgOrder[b.urgency] || 0) - (urgOrder[a.urgency] || 0);
        
        case 'status':
          const statusOrder = { pending: 2, resolved: 1 };
          return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
        
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    setFilteredReports(filtered);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'critical':
        return <AlertIcon className="h-4 w-4 text-red-600" />;
      case 'high':
        return <ZapIcon className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <AlertCircleIcon className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'userReports', reportId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        resolvedBy: user.uid,
        resolvedAt: newStatus === 'resolved' ? serverTimestamp() : null
      });
      
      // If marking as resolved for critical incidents, log the action
      const report = reports.find(r => r.id === reportId);
      if (report?.urgency === 'critical' && newStatus === 'resolved') {
        // Log critical incident resolution
        await addDoc(collection(db, 'adminActions'), {
          type: 'critical_incident_resolved',
          reportId: reportId,
          adminId: user.uid,
          timestamp: serverTimestamp(),
          details: {
            reportTitle: report.title,
            reportCategory: report.category,
            resolutionTime: new Date() - new Date(report.createdAt)
          }
        });
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Failed to update report status');
    }
    setIsProcessing(false);
  };

  const exportReports = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "ID,Title,Category,Urgency,Status,Reporter,Date,Description\n" +
      filteredReports.map(report => 
        `"${report.id}","${report.title}","${report.category}","${report.urgency}","${report.status}","${report.reporterName || report.reporterEmail}","${report.createdAt?.toLocaleDateString()}","${report.description?.replace(/"/g, '""')}"`
      ).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Reports</h1>
          <p className="text-gray-600">Manage and respond to user reports categorized by urgency</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={exportReports}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Critical Reports</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.critical}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ZapIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">High Priority</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.high}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.pending}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.resolved}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <SearchIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Urgencies</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="incident">Incident</option>
            <option value="complaint">Complaint</option>
            <option value="suggestion">Suggestion</option>
            <option value="technical">Technical</option>
            <option value="safety">Safety</option>
            <option value="other">Other</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="urgency_date">Urgency & Date</option>
            <option value="date">Date</option>
            <option value="urgency">Urgency</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No reports found matching your criteria</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getUrgencyIcon(report.urgency)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {report.title || 'Untitled Report'}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUrgencyColor(report.urgency)}`}>
                          {report.urgency?.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(report.status)}`}>
                          {report.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        
                        {report.status === 'pending' && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateStatus(report.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            disabled={isProcessing}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="">Update Status</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {report.description}
                      </p>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-1" />
                        {report.reporterName || report.reporterEmail || 'Anonymous'}
                      </div>
                      
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {report.createdAt?.toLocaleDateString()} {report.createdAt?.toLocaleTimeString()}
                      </div>
                      
                      {report.location && (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {report.location}
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <span className="font-medium">{report.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report Details Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-gray-900">{selectedReport.title}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUrgencyColor(selectedReport.urgency)}`}>
                      {selectedReport.urgency?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedReport.status)}`}>
                      {selectedReport.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <p className="text-gray-900">{selectedReport.category}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reporter</label>
                    <p className="text-gray-900">{selectedReport.reporterName || selectedReport.reporterEmail || 'Anonymous'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Reported</label>
                    <p className="text-gray-900">
                      {selectedReport.createdAt?.toLocaleDateString()} {selectedReport.createdAt?.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {selectedReport.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900">{selectedReport.location}</p>
                  </div>
                )}
                
                {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                    <div className="space-y-2">
                      {selectedReport.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline block"
                        >
                          {attachment.name || `Attachment ${index + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedReport.status === 'pending' && (
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'in_progress')}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshIcon className="h-4 w-4 animate-spin" /> : 'Mark In Progress'}
                    </button>
                    
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshIcon className="h-4 w-4 animate-spin" /> : 'Mark Resolved'}
                    </button>
                    
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'dismissed')}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

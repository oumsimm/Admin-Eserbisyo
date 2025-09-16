import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../contexts/UserContext';
import reportsService from '../services/reportsService';

const ReportIncidentScreen = ({ navigation, route }) => {
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    urgency: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'incident', label: 'Incident/Emergency', icon: 'alert-circle' },
    { value: 'safety', label: 'Safety Concern', icon: 'shield' },
    { value: 'complaint', label: 'Complaint', icon: 'chatbox-ellipses' },
    { value: 'technical', label: 'Technical Issue', icon: 'construct' },
    { value: 'suggestion', label: 'Suggestion', icon: 'bulb' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' }
  ];

  const urgencyLevels = [
    { value: 'critical', label: 'Critical', color: '#ef4444', description: 'Emergency/Immediate attention' },
    { value: 'high', label: 'High', color: '#f97316', description: 'Urgent but not emergency' },
    { value: 'medium', label: 'Medium', color: '#eab308', description: 'Important but not urgent' },
    { value: 'low', label: 'Low', color: '#22c55e', description: 'Can be addressed later' }
  ];

  const handleSubmit = async () => {
    // Validate form
    const validation = reportsService.validateReportData(formData);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-determine urgency if not selected
      let urgency = formData.urgency;
      if (!urgency) {
        urgency = reportsService.determineUrgency(
          formData.title,
          formData.description,
          formData.category
        );
      }

      const reportData = {
        ...formData,
        urgency,
        reporterId: user?.uid,
        reporterName: user?.name || user?.displayName,
        reporterEmail: user?.email,
        userCode: user?.userCode,
        reportedItemId: route?.params?.prefill?.reportedItemId || null,
        targetType: route?.params?.prefill?.targetType || null,
      };

      const result = await reportsService.createReport(reportData);

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          `Your report has been submitted successfully. ${urgency === 'critical' ? 'Due to the critical nature, administrators have been notified immediately.' : 'We will review it and get back to you.'}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );

        // Reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          location: '',
          urgency: ''
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }

    setIsSubmitting(false);
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  React.useEffect(() => {
    const prefill = route?.params?.prefill;
    if (prefill) {
      setFormData((prev) => ({
        ...prev,
        title: prefill.title || prev.title,
        description: prefill.description || prev.description,
        category: prefill.category || prev.category,
      }));
    }
  }, [route?.params?.prefill]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report Incident</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Report Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief summary of the issue"
                value={formData.title}
                onChangeText={(value) => updateFormData('title', value)}
                maxLength={100}
              />
              <Text style={styles.charCount}>{formData.title.length}/100</Text>
            </View>

            {/* Category */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.categoryItem,
                      formData.category === category.value && styles.categoryItemSelected
                    ]}
                    onPress={() => updateFormData('category', category.value)}
                  >
                    <Ionicons 
                      name={category.icon} 
                      size={24} 
                      color={formData.category === category.value ? '#3b82f6' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.categoryLabel,
                      formData.category === category.value && styles.categoryLabelSelected
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Provide detailed information about the incident or issue"
                value={formData.description}
                onChangeText={(value) => updateFormData('description', value)}
                multiline={true}
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{formData.description.length}/500</Text>
            </View>

            {/* Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Where did this occur?"
                value={formData.location}
                onChangeText={(value) => updateFormData('location', value)}
                maxLength={100}
              />
            </View>

            {/* Urgency Level */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Urgency Level (Optional)</Text>
              <Text style={styles.subLabel}>
                If not selected, we'll automatically determine based on your description
              </Text>
              <View style={styles.urgencyContainer}>
                {urgencyLevels.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.urgencyItem,
                      formData.urgency === level.value && styles.urgencyItemSelected,
                      { borderColor: level.color }
                    ]}
                    onPress={() => updateFormData('urgency', level.value)}
                  >
                    <View style={[styles.urgencyIndicator, { backgroundColor: level.color }]} />
                    <View style={styles.urgencyContent}>
                      <Text style={[
                        styles.urgencyLabel,
                        formData.urgency === level.value && styles.urgencyLabelSelected
                      ]}>
                        {level.label}
                      </Text>
                      <Text style={styles.urgencyDescription}>{level.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Critical incidents will notify administrators immediately. 
                Your report is anonymous unless you choose to provide contact information.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!formData.title || !formData.description || !formData.category || isSubmitting) && 
                styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!formData.title || !formData.description || !formData.category || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
              {!isSubmitting && (
                <Ionicons name="send" size={20} color="#ffffff" style={styles.submitIcon} />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginRight: 40, // Compensate for back button
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  subLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  textArea: {
    height: 100,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  categoryLabelSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  urgencyContainer: {
    gap: 12,
  },
  urgencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  urgencyItemSelected: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
  },
  urgencyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  urgencyContent: {
    flex: 1,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  urgencyLabelSelected: {
    color: '#111827',
  },
  urgencyDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  submitIcon: {
    marginLeft: 8,
  },
});

export default ReportIncidentScreen;

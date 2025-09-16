import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan 1', activities: 45, events: 8 },
  { name: 'Jan 5', activities: 52, events: 12 },
  { name: 'Jan 10', activities: 48, events: 10 },
  { name: 'Jan 15', activities: 61, events: 15 },
  { name: 'Jan 20', activities: 55, events: 11 },
  { name: 'Jan 25', activities: 67, events: 18 },
  { name: 'Jan 30', activities: 74, events: 21 },
];

export default function ActivityChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="activities" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Activities"
          />
          <Line 
            type="monotone" 
            dataKey="events" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Events"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

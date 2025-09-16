import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Week 1', users: 1156, newUsers: 89 },
  { name: 'Week 2', users: 1183, newUsers: 127 },
  { name: 'Week 3', users: 1205, newUsers: 94 },
  { name: 'Week 4', users: 1247, newUsers: 142 },
];

export default function UserChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area 
            type="monotone" 
            dataKey="users" 
            stackId="1"
            stroke="#8884d8" 
            fill="#8884d8"
            name="Total Users"
          />
          <Area 
            type="monotone" 
            dataKey="newUsers" 
            stackId="2"
            stroke="#82ca9d" 
            fill="#82ca9d"
            name="New Users"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


import React from 'react';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartData, ChartType } from '../types';

interface DataVisualizationProps {
  chartData: ChartData | null;
}

const COLORS = ['#6200ee', '#03dac6', '#f50057', '#ffab00', '#76ff03'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface p-2 border border-primary rounded-md shadow-lg">
        <p className="label text-on-surface">{`${label} : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const DataVisualization: React.FC<DataVisualizationProps> = ({ chartData }) => {
  if (!chartData || chartData.type === ChartType.NONE || !chartData.data || chartData.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-muted">
        <p>Ask the robot to analyze the data to see a chart here.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 bg-surface rounded-lg">
      <ResponsiveContainer width="100%" height="100%">
        {chartData.type === ChartType.BAR ? (
          <BarChart data={chartData.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#424242" />
            <XAxis dataKey="name" stroke="#a0a0a0" />
            <YAxis stroke="#a0a0a0" />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(98, 0, 238, 0.2)'}}/>
            <Legend />
            <Bar dataKey="value" fill="#6200ee" />
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={chartData.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />}/>
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default DataVisualization;

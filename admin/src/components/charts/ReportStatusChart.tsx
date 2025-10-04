import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface ReportStatusChartProps {
  data: {
    validatedReports: number;
    respondingReports: number;
    pendingReports: number;
    rejectedReports: number;
    resolvedReports: number;
  };
}

const COLORS = {
  validated: '#28a745',
  responding: '#17a2b8', 
  pending: '#ffc107',
  rejected: '#dc3545',
  resolved: '#6f42c1'
};

export function ReportStatusChart({ data }: ReportStatusChartProps) {
  const chartData = [
    {
      name: 'Validated',
      value: data.validatedReports,
      color: COLORS.validated
    },
    {
      name: 'Responding',
      value: data.respondingReports,
      color: COLORS.responding
    },
    {
      name: 'Pending',
      value: data.pendingReports,
      color: COLORS.pending
    },
    {
      name: 'Resolved',
      value: data.resolvedReports,
      color: COLORS.resolved
    },
    {
      name: 'Rejected',
      value: data.rejectedReports,
      color: COLORS.rejected
    }
  ].filter(item => item.value > 0); // Only show non-zero values

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="fw-medium mb-1">{data.name}</p>
          <p className="mb-0">
            <span className="fw-bold" style={{ color: data.payload.color }}>
              {data.value.toLocaleString()}
            </span> reports
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="h-100 border-0 shadow-sm">
      <CardHeader className="bg-light border-bottom">
        <CardTitle className="h6 mb-0 text-ccrs-primary">Report Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-5">
            <div className="text-muted small">No report data available</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

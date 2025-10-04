import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface CategoryStatsChartProps {
  data: Record<string, number>;
}

const COLORS = ['#2B4C8C', '#4674e5', '#17a2b8', '#28a745', '#ffc107', '#dc3545'];

export function CategoryStatsChart({ data }: CategoryStatsChartProps) {
  const chartData = Object.entries(data).map(([category, count], index) => ({
    category: category.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    count,
    fill: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="fw-medium mb-1">{label}</p>
          <p className="mb-0">
            <span className="fw-bold text-primary">
              {payload[0].value.toLocaleString()}
            </span> reports
          </p>
        </div>
      );
    }
    return null;
  };

  const formatXAxisLabel = (tickItem: string) => {
    // Truncate long category names
    if (tickItem.length > 10) {
      return tickItem.substring(0, 8) + '...';
    }
    return tickItem;
  };

  return (
    <Card className="h-100 border-0 shadow-sm">
      <CardHeader className="bg-light border-bottom">
        <CardTitle className="h6 mb-0 text-ccrs-primary">Category Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatXAxisLabel}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  fill="#2B4C8C"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-5">
            <div className="text-muted small">No category data available</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

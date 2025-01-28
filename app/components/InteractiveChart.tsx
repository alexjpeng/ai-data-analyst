import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar, ScatterChart as RechartsScatterChart, Scatter, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface ChartElement {
  label: string;
  group?: string;
  value: number;
  x?: number;
  y?: number;
}

interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'box';
  title?: string;
  x_label?: string;
  y_label?: string;
  x_unit?: string;
  y_unit?: string;
  elements: ChartElement[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function InteractiveChart({ data }: { data: ChartData }) {
  const formatData = () => {
    if (data.type === 'pie') {
      return data.elements.map(el => ({
        name: el.label,
        value: el.value
      }));
    }
    
    if (data.type === 'scatter') {
      return data.elements.map(el => ({
        x: el.x,
        y: el.y,
        label: el.label
      }));
    }

    // For line and bar charts
    const groups = [...new Set(data.elements.map(el => el.group))];
    if (groups.length <= 1) {
      return data.elements;
    }

    // Group data by label for multiple series
    const groupedData = data.elements.reduce((acc, el) => {
      const existingEntry = acc.find(item => item.label === el.label);
      if (existingEntry) {
        existingEntry[el.group!] = el.value;
      } else {
        acc.push({
          label: el.label,
          [el.group!]: el.value
        });
      }
      return acc;
    }, [] as any[]);

    return groupedData;
  };

  const renderChart = () => {
    const formattedData = formatData();

    switch (data.type) {
      case 'line':
        const groups = [...new Set(data.elements.map(el => el.group))];
        return (
          <RechartsLineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" label={{ value: data.x_label, position: 'bottom' }} />
            <YAxis label={{ value: data.y_label, angle: -90, position: 'left' }} />
            <Tooltip />
            <Legend />
            {groups.length <= 1 ? (
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            ) : (
              groups.map((group, index) => (
                <Line 
                  key={group} 
                  type="monotone" 
                  dataKey={group} 
                  stroke={COLORS[index % COLORS.length]} 
                />
              ))
            )}
          </RechartsLineChart>
        );

      case 'bar':
        const barGroups = [...new Set(data.elements.map(el => el.group))];
        return (
          <RechartsBarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" label={{ value: data.x_label, position: 'bottom' }} />
            <YAxis label={{ value: data.y_label, angle: -90, position: 'left' }} />
            <Tooltip />
            <Legend />
            {barGroups.length <= 1 ? (
              <Bar dataKey="value" fill="#8884d8" />
            ) : (
              barGroups.map((group, index) => (
                <Bar 
                  key={group} 
                  dataKey={group} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))
            )}
          </RechartsBarChart>
        );

      case 'scatter':
        return (
          <RechartsScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={data.x_label} 
              label={{ value: data.x_label, position: 'bottom' }} 
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={data.y_label} 
              label={{ value: data.y_label, angle: -90, position: 'left' }} 
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={data.title} data={formattedData} fill="#8884d8" />
          </RechartsScatterChart>
        );

      case 'pie':
        return (
          <RechartsPieChart>
            <Pie
              data={formattedData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </RechartsPieChart>
        );

      default:
        return <div>Unsupported chart type: {data.type}</div>;
    }
  };

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg">
      <h3 className="text-center font-semibold mb-4">{data.title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
} 
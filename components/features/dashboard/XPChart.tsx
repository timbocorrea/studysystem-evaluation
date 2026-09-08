import React from 'react';
import { ComposedChart, Line, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface XPChartProps {
    xpHistory: any[];
    barColor: string;
}

const XPChart: React.FC<XPChartProps> = ({ xpHistory, barColor }) => {
    return (
        <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={xpHistory}>
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    height={40}
                    tick={({ x, y, payload, index }) => {
                        const dataItem = xpHistory[index] as any;
                        return (
                            <g transform={`translate(${x},${y})`}>
                                <text x={0} y={0} dy={10} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold">
                                    {payload.value}
                                </text>
                                <text x={0} y={0} dy={22} textAnchor="middle" fill="#475569" fontSize={9}>
                                    {dataItem.day}/{dataItem.month}
                                </text>
                            </g>
                        );
                    }}
                />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: any) => {
                        if (name === 'xp') return [`${value} XP`, 'Experiência'];
                        if (name === 'minutes') return [`${value} min`, 'Tempo de Estudo'];
                        return [value, name];
                    }}
                />
                {/* XP Bars */}
                <Bar yAxisId="left" dataKey="xp" fill={barColor} radius={[4, 4, 4, 4]} barSize={20} />

                {/* Time Line */}
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="minutes"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{ fill: '#34d399', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default XPChart;

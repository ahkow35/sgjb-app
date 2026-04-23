'use client'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  prices: number[]
}

export function PriceTrendSparkline({ prices }: Props) {
  if (prices.length < 2) return null
  const data = prices.map((price, i) => ({ i, price }))
  return (
    <ResponsiveContainer width={80} height={24}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="price"
          stroke="#2563eb"
          dot={false}
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

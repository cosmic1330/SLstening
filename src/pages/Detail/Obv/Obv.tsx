import {
  Box,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import obv from "../../../cls_tools/obv";
import BaseCandlestickRectangle from "../../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealsContext } from "../../../context/DealsContext";
import { UrlTaPerdOptions } from "../../../types";
import { calculateObvSignals } from "../../../utils/obvStrategy";
import { calculateBollingerBands, calculateSMA } from "../../../utils/technicalIndicators";

// Helper to format YYYYMMDD number to Date string
const formatDateTick = (tick: number | string) => {
  const str = tick.toString();
  if (str.length === 8) {
    return `${str.slice(0, 4)}/${str.slice(4, 6)}/${str.slice(6)}`;
  }
  return str;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateStr = formatDateTick(label);
    
    // Sort payload: Signal entries first, then main data
    const sortedPayload = [...payload].sort((a, b) => {
        // Prioritize Scatter (Signal) entries
        if (a.dataKey === 'longEntry' || a.dataKey === 'shortEntry' || a.dataKey === 'longExit' || a.dataKey === 'shortExit') return -1;
        if (b.dataKey === 'longEntry' || b.dataKey === 'shortEntry' || b.dataKey === 'longExit' || b.dataKey === 'shortExit') return 1;
        return 0;
    });

    return (
      <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          border: "1px solid #ccc",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          padding: "10px",
          textAlign: "left"
      }}>
        <p style={{ color: "#666", marginBottom: 8, margin: 0, fontWeight: 'bold' }}>時間: {dateStr}</p>
        
        {data.signalReason && (
             <div style={{ marginTop: 8, marginBottom: 8, padding: '4px 8px', backgroundColor: '#e3f2fd', borderRadius: 4, borderLeft: '4px solid #2196f3' }}>
                 <Typography variant="body2" fontWeight="bold" color="#0d47a1" style={{ whiteSpace: 'pre-wrap'}}>
                    {data.signalReason}
                 </Typography>
             </div>
        )}

        {sortedPayload.map((entry: any, index: number) => {
             // Filter out internal/invisible items
             if (['h', 'c', 'l', 'o'].includes(entry.dataKey)) return null;
             if (entry.value === null || entry.value === undefined) return null; // Skip null signals

             return (
                 <p key={index} style={{ color: entry.color, margin: '2px 0', fontSize: '0.875rem' }}>
                     {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                 </p>
             );
        })}
      </div>
    );
  }
  return null;
};

export default function Obv({ perd }: { perd: UrlTaPerdOptions }) {
  // Use slice instead of splice to avoid mutating the context array
  const deals = useContext(DealsContext).slice(-150);

  const signals = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    return calculateObvSignals(deals);
  }, [deals]);

  const chartData = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    let baseData = [];
    let obvData = obv.init(deals[0]);
    baseData.push({ ...deals[0], obv: obvData.obv });
    for (let i = 1; i < deals.length; i++) {
      obvData = obv.next(deals[i], obvData);
      baseData.push({ ...deals[i], obv: obvData.obv });
    }

    const closes = deals.map((d) => d.c);
    const ma20 = calculateSMA(closes, 20);
    const ma50 = calculateSMA(closes, 50);
    const bb20 = calculateBollingerBands(closes, 20, 2);

    const signalMap = new Map(signals.map((s) => [s.t, s]));

    return baseData.map((d, i) => {
      const signal = signalMap.get(d.t);
      return {
        ...d,
        ma20: ma20[i],
        ma50: ma50[i],
        bbUpper: bb20.upper[i],
        bbLower: bb20.lower[i],
        // Signals (kept for Tooltip but hidden from chart view via removed Scatters)
        longEntry: signal?.type === 'LONG_ENTRY' ? d.l * 0.98 : null,
        shortEntry: signal?.type === 'SHORT_ENTRY' ? d.h * 1.02 : null,
        longExit: signal?.type === 'LONG_EXIT' ? d.h * 1.02 : null,
        shortExit: signal?.type === 'SHORT_EXIT' ? d.l * 0.98 : null,
        signalReason: signal?.reason || null,
      };
    });
  }, [deals, signals]);

  if (chartData.length === 0) {
    return (
      <Box
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container
      component="main"
      maxWidth={false}
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        p: 2,
        bgcolor: "#f5f5f5",
        overflow: "hidden", // Prevent window scroll
      }}
    >
      {/* Header Section */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexShrink: 0 }}>
        <MuiTooltip
          title="On-Balance Volume (OBV) Professional Dashboard"
          arrow
        >
            <Typography variant="h5" component="h1" fontWeight="bold">
            OBV 智能分析儀表板
            </Typography>
        </MuiTooltip>
        <Box sx={{ flexGrow: 1 }} />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden'}}>
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" tickFormatter={formatDateTick} />
            <YAxis
                orientation="left"
                domain={['auto', 'auto']}
                tickFormatter={(val) => val.toFixed(2)}
            />
            <YAxis
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']}
            />
            <RechartsTooltip content={<CustomTooltip />} />

            {/* Invisible lines for Tooltip payload and BaseCandlestickRectangle */}
            {/* ORDER IS CRITICAL: High, Close, Low, Open */}
            <Line dataKey="h" stroke="#000" opacity={0} dot={false} legendType="none" />
            <Line dataKey="c" stroke="#000" opacity={0} dot={false} legendType="none" />
            <Line dataKey="l" stroke="#000" opacity={0} dot={false} legendType="none" />
            <Line dataKey="o" stroke="#000" opacity={0} dot={false} legendType="none" />

            {/* Indicators */}
            <Line dataKey="ma20" stroke="#f1af20ff" strokeWidth={1} dot={false} name="MA20" />
            <Line dataKey="ma50" stroke="#9c27b0" strokeWidth={1} dot={false} name="MA50" />
            
            <Line dataKey="bbUpper" stroke="#9e9e9e" strokeDasharray="3 3" strokeWidth={1} dot={false} name="BB Upper" />
            <Line dataKey="bbLower" stroke="#9e9e9e" strokeDasharray="3 3" strokeWidth={1} dot={false} name="BB Lower" />

            {/* 
                Taiwan Standard Colors:
                Up (Rising): Red (#ff4d4f)
                Down (Falling): Green (#52c41a)
            */}
            <Customized 
                component={BaseCandlestickRectangle} 
                upColor="#ff4d4f" 
                downColor="#52c41a"
            />

            <Line
                yAxisId="right"
                type="monotone"
                dataKey="obv"
                stroke="#2196f3"
                strokeWidth={2}
                dot={false}
                name="OBV"
            />
            </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}

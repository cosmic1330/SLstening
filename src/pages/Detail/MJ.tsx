import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Tooltip as MuiTooltip,
  Stack,
  Step,
  StepButton,
  Stepper,
  Typography,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import kd from "../../cls_tools/kd";
import macd from "../../cls_tools/macd";
import BaseCandlestickRectangle from "../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealsContext } from "../../context/DealsContext";
import Fundamental from "./Tooltip/Fundamental";

interface MjChartData
  extends Partial<{
    t: number | string;
    o: number | null;
    h: number | null;
    l: number | null;
    c: number | null;
    v: number | null;
  }> {
  j: number | null;
  osc: number | null;
  ma20: number | null;
  longZone: number | null; // For Area chart
  shortZone: number | null; // For Area chart
  positiveOsc: number | null;
  negativeOsc: number | null;
}

type CheckStatus = "pass" | "fail" | "manual";

interface StepCheck {
  label: string;
  status: CheckStatus;
}

interface MjStep {
  label: string;
  description: string;
  checks: StepCheck[];
}

export default function MJ({ id }: { id?: string }) {
  const deals = useContext(DealsContext);
  const [activeStep, setActiveStep] = useState(0);

  const chartData = useMemo((): MjChartData[] => {
    if (!deals || deals.length === 0) return [];

    let kd_data = kd.init(deals[0], 9);
    let macd_data = macd.init(deals[0]);

    const response: MjChartData[] = [];

    // First item
    response.push({
      ...deals[0],
      j: kd_data.j || null,
      osc: macd_data.osc || null,
      ma20: null,
      longZone: null,
      shortZone: null,
      positiveOsc: macd_data.osc > 0 ? macd_data.osc : 0,
      negativeOsc: macd_data.osc < 0 ? macd_data.osc : 0,
    });

    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];

      // Indicator calc
      kd_data = kd.next(deal, kd_data, 9);
      macd_data = macd.next(deal, macd_data);

      // MA20
      let ma20: number | null = null;
      if (i >= 19) {
        let sumC = 0;
        for (let j = 0; j < 20; j++) {
          sumC += deals[i - j].c || 0;
        }
        ma20 = sumC / 20;
      }

      const j = kd_data.j || 0;
      const osc = macd_data.osc || 0;

      // Logic from original file:
      // Long: J > 50 && Osc > 0
      // Short: J < 50 && Osc < 0
      const isLong = j > 50 && osc > 0;
      const isShort = j < 50 && osc < 0;

      response.push({
        ...deal,
        j,
        osc,
        ma20,
        longZone: isLong ? j : null,
        shortZone: isShort ? j : null,
        positiveOsc: osc > 0 ? osc : 0,
        negativeOsc: osc < 0 ? osc : 0,
      });
    }
    return response.slice(-160);
  }, [deals]);

  // Calculate Entry Signals (State Transition)
  const signals = useMemo(() => {
    const result = [];
    for (let i = 1; i < chartData.length; i++) {
      const curr = chartData[i];
      const prev = chartData[i - 1];

      const currLong = (curr.j || 0) > 50 && (curr.osc || 0) > 0;
      const prevLong = (prev.j || 0) > 50 && (prev.osc || 0) > 0;

      const currShort = (curr.j || 0) < 50 && (curr.osc || 0) < 0;
      const prevShort = (prev.j || 0) < 50 && (prev.osc || 0) < 0;

      if (currLong && !prevLong) {
        result.push({ t: curr.t, type: "entry_long", price: curr.c });
      } else if (currShort && !prevShort) {
        result.push({ t: curr.t, type: "entry_short", price: curr.c });
      }
    }
    return result;
  }, [chartData]);

  const { steps, score, recommendation } = useMemo(() => {
    if (chartData.length === 0)
      return { steps: [], score: 0, recommendation: "" };

    const current = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2] || current;

    const isNum = (n: any): n is number => typeof n === "number";

    const price = current.c;
    const j = current.j;
    const osc = current.osc;
    const ma20 = current.ma20;

    if (!isNum(price) || !isNum(j) || !isNum(osc)) {
      return { steps: [], score: 0, recommendation: "Data Error" };
    }

    const isLongZone = j > 50 && osc > 0;
    const isShortZone = j < 50 && osc < 0;
    const trendUp = isNum(ma20) && price > ma20;
    const jRising = j > (prev.j || 0);
    const oscRising = osc > (prev.osc || 0);

    // Scoring
    let totalScore = 0;

    // 1. Zone Status (40)
    if (isLongZone) totalScore += 40;
    else if (j > 50 || osc > 0) totalScore += 20; // Partial bull
    if (isShortZone) totalScore -= 40;

    // 2. Trend (20)
    if (trendUp) totalScore += 20;

    // 3. Momentum (40)
    if (jRising) totalScore += 20;
    if (oscRising) totalScore += 20;

    if (totalScore < 0) totalScore = 0;
    if (totalScore > 100) totalScore = 100;

    let rec = "Neutral";
    if (totalScore >= 80) rec = "Strong Buy";
    else if (totalScore >= 60) rec = "Buy";
    else if (totalScore <= 20) rec = "Sell";
    else rec = "Hold";

    // const stopLoss = (price * 0.95).toFixed(2);

    const mjSteps: MjStep[] = [
      {
        label: "I. 指標狀態",
        description: "MJ 雙指標共振",
        checks: [
          {
            label: `KD-J 線 > 50: ${j.toFixed(1)}`,
            status: j > 50 ? "pass" : "fail",
          },
          {
            label: `MACD Osc > 0: ${osc.toFixed(2)}`,
            status: osc > 0 ? "pass" : "fail",
          },
        ],
      },
      {
        label: "II. 訊號判定",
        description: "多空區域確認",
        checks: [
          {
            label: `多方共振 (J>50 & Osc>0): ${isLongZone ? "Yes" : "No"}`,
            status: isLongZone ? "pass" : "fail",
          },
          {
            label: `空方共振 (J<50 & Osc<0): ${isShortZone ? "Yes" : "No"}`,
            status: isShortZone ? "fail" : "pass",
          },
        ],
      },
      {
        label: "III. 趨勢與動能",
        description: "MA20 與 動能方向",
        checks: [
          {
            label: `價格 > MA20: ${trendUp ? "Yes" : "No"}`,
            status: trendUp ? "pass" : "fail",
          },
          {
            label: `J線 上升中: ${jRising ? "Yes" : "No"}`,
            status: jRising ? "pass" : "fail",
          },
        ],
      },
      {
        label: "IV. 綜合評估",
        description: `得分: ${totalScore} - ${rec}`,
        checks: [
          {
            label: `目前建議: ${rec}`,
            status: totalScore >= 60 ? "pass" : "manual",
          },
        ],
      },
    ];

    return { steps: mjSteps, score: totalScore, recommendation: rec };
  }, [chartData]);

  const handleStep = (step: number) => () => {
    setActiveStep(step);
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case "pass":
        return <CheckCircleIcon fontSize="small" color="success" />;
      case "fail":
        return <CancelIcon fontSize="small" color="error" />;
      case "manual":
      default:
        return <HelpOutlineIcon fontSize="small" color="disabled" />;
    }
  };

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
      sx={{ height: "100vh", display: "flex", flexDirection: "column", pt: 1 }}
    >
      <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
        <MuiTooltip title={<Fundamental id={id} />} arrow>
          <Typography variant="h6" component="div" color="white">
            MJ Strategy
          </Typography>
        </MuiTooltip>

        <Chip
          label={`${score}分 - ${recommendation}`}
          color={score >= 80 ? "success" : score >= 60 ? "warning" : "error"}
          variant="outlined"
          size="small"
        />

        <Divider orientation="vertical" flexItem />
        <Box sx={{ flexGrow: 1 }}>
          <Stepper nonLinear activeStep={activeStep}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepButton color="inherit" onClick={handleStep(index)}>
                  {step.label}
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Stack>

      <Card variant="outlined" sx={{ mb: 1, bgcolor: "background.default" }}>
        <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
          >
            <Box sx={{ minWidth: 200, flexShrink: 0 }}>
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                {steps[activeStep]?.description}
              </Typography>
            </Box>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", md: "block" } }}
            />
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {steps[activeStep]?.checks.map((check, idx) => (
                <Chip
                  key={idx}
                  icon={getStatusIcon(check.status)}
                  label={check.label}
                  variant="outlined"
                  color={
                    check.status === "pass"
                      ? "success"
                      : check.status === "fail"
                      ? "error"
                      : "default"
                  }
                  size="small"
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {/* Main Price Chart (65%) */}
        <ResponsiveContainer width="100%" height="65%">
          <ComposedChart data={chartData} syncId="mjSync">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" hide />
            <YAxis domain={["auto", "auto"]} />
            <YAxis
              yAxisId="right_dummy"
              orientation="right"
              tick={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              offset={50}
              contentStyle={{
                backgroundColor: "#222",
                border: "none",
                borderRadius: 4,
              }}
              itemStyle={{ fontSize: 12 }}
              labelStyle={{ color: "#aaa", marginBottom: 5 }}
            />
            <Line
              dataKey="h"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="c"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="l"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="o"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Customized component={BaseCandlestickRectangle} />

            <Line
              dataKey="ma20"
              stroke="#ff9800"
              dot={false}
              activeDot={false}
              name="20 MA"
              strokeWidth={1.5}
            />

            {/* Signal Markers */}
            {signals.map((signal) => {
              const isLong = signal.type === "entry_long";
              const yPos = isLong ? signal.price! * 0.99 : signal.price! * 1.01;
              const color = isLong ? "#f44336" : "#4caf50";

              return (
                <ReferenceDot
                  key={signal.t}
                  x={signal.t}
                  y={yPos}
                  r={4}
                  stroke="none"
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    if (!cx || !cy) return <g />;

                    return (
                      <g>
                        {isLong ? (
                          // Long Entry
                          <>
                            <path
                              d={`M${cx - 5},${cy + 10} L${cx + 5},${
                                cy + 10
                              } L${cx},${cy} Z`}
                              fill={color}
                            />
                            <text
                              x={cx}
                              y={cy + 22}
                              textAnchor="middle"
                              fill={color}
                              fontSize={11}
                              fontWeight="bold"
                            >
                              買進
                            </text>
                          </>
                        ) : (
                          // Short Entry
                          <>
                            <path
                              d={`M${cx - 5},${cy - 10} L${cx + 5},${
                                cy - 10
                              } L${cx},${cy} Z`}
                              fill={color}
                            />
                            <text
                              x={cx}
                              y={cy - 15}
                              textAnchor="middle"
                              fill={color}
                              fontSize={11}
                              fontWeight="bold"
                            >
                              賣出
                            </text>
                          </>
                        )}
                      </g>
                    );
                  }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Combined J-Line & MACD Chart (35%) */}
        <ResponsiveContainer width="100%" height="35%">
          <ComposedChart data={chartData} syncId="mjSync">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" />

            {/* Left Axis for MACD Osc */}
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#888"
              fontSize={10}
            />

            {/* Right Axis for J-Line (0-100) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              stroke="#2196f3"
              fontSize={10}
              width={40}
            />

            <Tooltip
              offset={50}
              contentStyle={{ backgroundColor: "#222", border: "none" }}
            />

            <ReferenceLine y={0} yAxisId="left" stroke="#666" opacity={0.5} />
            <ReferenceLine
              y={50}
              yAxisId="right"
              stroke="#666"
              strokeDasharray="3 3"
              opacity={0.5}
            />

            {/* MACD Bars (Left Axis) */}
            <Bar
              yAxisId="left"
              dataKey="positiveOsc"
              fill="#f44336"
              barSize={3}
              name="Osc +"
            />
            <Bar
              yAxisId="left"
              dataKey="negativeOsc"
              fill="#4caf50"
              barSize={3}
              name="Osc -"
            />

            {/* J Line Zones (Right Axis) */}
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="longZone"
              fill="#ffcdd2"
              stroke="none"
              baseValue={50}
              opacity={0.3}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="shortZone"
              fill="#c8e6c9"
              stroke="none"
              baseValue={50}
              opacity={0.3}
            />
            <Line
              yAxisId="right"
              dataKey="j"
              stroke="#2196f3"
              dot={false}
              strokeWidth={2}
              name="J Line"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}

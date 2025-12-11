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
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import obv from "../../../cls_tools/obv";
import BaseCandlestickRectangle from "../../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealsContext } from "../../../context/DealsContext";
import { DivergenceSignalType, UrlTaPerdOptions } from "../../../types";
import detectObvDivergence from "../../../utils/detectObvDivergence";

type CheckStatus = "pass" | "fail" | "manual";

interface StepCheck {
  label: string;
  status: CheckStatus;
}

interface ObvStep {
  label: string;
  description: string;
  checks: StepCheck[];
}

const BuyArrow = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <path
      d={`M${cx},${cy + 8} L${cx - 5},${cy + 15} L${cx + 5},${cy + 15} Z`}
      fill="#4caf50"
    />
  );
};

const ExitArrow = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <path
      d={`M${cx},${cy - 8} L${cx - 5},${cy - 15} L${cx + 5},${cy - 15} Z`}
      fill="#f44336"
    />
  );
};

// Helper to format YYYYMMDD number to Date string
const formatDateTick = (tick: number) => {
  const str = tick.toString();
  if (str.length === 8) {
    return `${str.slice(0, 4)}/${str.slice(4, 6)}/${str.slice(6)}`;
  }
  return new Date(tick).toLocaleDateString();
};

// Main Component
export default function Obv({ perd }: { perd: UrlTaPerdOptions }) {
  const deals = useContext(DealsContext);
  const [activeStep, setActiveStep] = useState(0);

  const signals = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    let tempChartData = [];
    let obvData = obv.init(deals[0]);
    tempChartData.push({ ...deals[0], obv: obvData.obv });
    for (let i = 1; i < deals.length; i++) {
      obvData = obv.next(deals[i], obvData);
      tempChartData.push({ ...deals[i], obv: obvData.obv });
    }
    return detectObvDivergence(tempChartData, {
      pivotPeriod: 5,
      maxLookback: 60,
    });
  }, [deals, perd]);

  const chartData = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    let baseData = [];
    let obvData = obv.init(deals[0]);
    baseData.push({ ...deals[0], obv: obvData.obv });
    for (let i = 1; i < deals.length; i++) {
      obvData = obv.next(deals[i], obvData);
      baseData.push({ ...deals[i], obv: obvData.obv });
    }

    const signalMap = new Map(signals.map((s) => [s.t, s.type]));

    return baseData.map((d) => {
      const type = signalMap.get(d.t);
      return {
        ...d,
        bullishSignal:
          type === DivergenceSignalType.BULLISH_DIVERGENCE ? d.obv : null,
        bearishSignal:
          type === DivergenceSignalType.BEARISH_DIVERGENCE ? d.obv : null,
      };
    });
  }, [deals, signals]);

  const { steps, score, recommendation } = useMemo(() => {
    if (chartData.length < 2)
      return { steps: [], score: 0, recommendation: "數據不足" };

    const current = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];

    const lastSignal = signals.length > 0 ? signals[signals.length - 1] : null;
    const daysSinceSignal = lastSignal
      ? Math.round((current.t - lastSignal.t) / (1000 * 60 * 60 * 24))
      : Infinity;

    // I. Trend Assessment
    const obvTrend = current.obv > prev.obv ? "上升" : "下降";
    const priceTrend = current.c > prev.c ? "上升" : "下降";
    const isSync =
      (obvTrend === "上升" && priceTrend === "上升") ||
      (obvTrend === "下降" && priceTrend === "下降");

    // II. Signal Assessment
    const hasRecentBullishSignal =
      lastSignal?.type === DivergenceSignalType.BULLISH_DIVERGENCE &&
      daysSinceSignal <= 10;
    const hasRecentBearishSignal =
      lastSignal?.type === DivergenceSignalType.BEARISH_DIVERGENCE &&
      daysSinceSignal <= 10;

    let totalScore = 50; // Base score
    if (isSync) totalScore += 10;
    if (obvTrend === "上升") totalScore += 10;
    if (hasRecentBullishSignal) totalScore += 20;
    if (hasRecentBearishSignal) totalScore -= 20;

    let rec = "中立";
    if (totalScore >= 80) rec = "強烈看多";
    else if (totalScore >= 60) rec = "偏多觀察";
    else if (totalScore <= 30) rec = "強烈看空";
    else if (totalScore <= 40) rec = "偏空觀察";

    const obvSteps: ObvStep[] = [
      {
        label: "I. 趨勢分析",
        description: "量價關係與趨勢方向",
        checks: [
          {
            label: `價格趨勢: ${priceTrend}`,
            status: priceTrend === "上升" ? "pass" : "fail",
          },
          {
            label: `OBV趨勢: ${obvTrend}`,
            status: obvTrend === "上升" ? "pass" : "fail",
          },
          {
            label: `量價是否同步: ${isSync ? "是" : "否"}`,
            status: isSync ? "pass" : "fail",
          },
        ],
      },
      {
        label: "II. 訊號檢查",
        description: "近期是否有背離訊號",
        checks: [
          {
            label: `發現看漲背離 (≤10日): ${
              hasRecentBullishSignal ? "是" : "否"
            }`,
            status: hasRecentBullishSignal ? "pass" : "manual",
          },
          {
            label: `發現看跌背離 (≤10日): ${
              hasRecentBearishSignal ? "是" : "否"
            }`,
            status: hasRecentBearishSignal ? "fail" : "manual",
          },
          {
            label: `距離上次訊號: ${
              daysSinceSignal > 30 ? "久遠" : daysSinceSignal + "天"
            }`,
            status: "manual",
          },
        ],
      },
      {
        label: "III. 綜合評估",
        description: `總分: ${totalScore} - ${rec}`,
        checks: [
          {
            label: "OBV 處於上升趨勢",
            status: current.obv > prev.obv ? "pass" : "fail",
          },
          {
            label: "近期存在多頭訊號",
            status: hasRecentBullishSignal ? "pass" : "manual",
          },
          {
            label: "近期無空頭訊號",
            status: !hasRecentBearishSignal ? "pass" : "fail",
          },
        ],
      },
    ];
    return { steps: obvSteps, score: totalScore, recommendation: rec };
  }, [chartData, signals]);

  const handleStep = (step: number) => () => setActiveStep(step);

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case "pass":
        return <CheckCircleIcon fontSize="small" color="success" />;
      case "fail":
        return <CancelIcon fontSize="small" color="error" />;
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
        <MuiTooltip
          title="On-Balance Volume (OBV) Professional Dashboard"
          arrow
        >
          <Typography variant="h6" component="div">
            OBV 專業儀表板
          </Typography>
        </MuiTooltip>
        <Chip
          label={`${score}分 - ${recommendation}`}
          color={score >= 60 ? "success" : score <= 40 ? "error" : "warning"}
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
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" tickFormatter={formatDateTick} />
            <YAxis
              yAxisId="left"
              orientation="left"
              label={{ value: "價格", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: "OBV", angle: -90, position: "insideRight" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(34, 34, 34, 0.8)",
                border: "none",
                borderRadius: 4,
              }}
              itemStyle={{ fontSize: 12 }}
              labelStyle={{ color: "#aaa", marginBottom: 5 }}
              labelFormatter={(label) => `日期: ${formatDateTick(label)}`}
            />

            {/* Dummy lines to make OHLC data available to the tooltip and BaseCandlestickRectangle */}
            {/* Order matters! BaseCandlestickRectangle expects: High, Close, Low, Open */}
            <Line
              yAxisId="left"
              dataKey="h"
              stroke="#000"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              yAxisId="left"
              dataKey="c"
              stroke="#000"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              yAxisId="left"
              dataKey="l"
              stroke="#000"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              yAxisId="left"
              dataKey="o"
              stroke="#000"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />

            <Customized component={BaseCandlestickRectangle} />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="obv"
              stroke="#2196f3"
              dot={false}
              name="OBV"
            />

            <Scatter
              yAxisId="right"
              dataKey="bullishSignal"
              shape={<BuyArrow />}
              legendType="none"
            />
            <Scatter
              yAxisId="right"
              dataKey="bearishSignal"
              shape={<ExitArrow />}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}

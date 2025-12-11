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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import mfi from "../../../cls_tools/mfi";
import BaseCandlestickRectangle from "../../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealsContext } from "../../../context/DealsContext";
import Fundamental from "../Tooltip/Fundamental";

interface MfiChartData
  extends Partial<{
    t: number | string;
    o: number | null;
    h: number | null;
    l: number | null;
    c: number | null;
    v: number | null;
  }> {
  mfi: number | null;
  ma20: number | null;
  ma10?: number | null;
  volMa20?: number | null;
}

type CheckStatus = "pass" | "fail" | "manual";

interface StepCheck {
  label: string;
  status: CheckStatus;
}

interface MfiStep {
  label: string;
  description: string;
  checks: StepCheck[];
}

export default function Mfi({ id }: { id?: string }) {
  const deals = useContext(DealsContext);
  const [activeStep, setActiveStep] = useState(0);

  const chartData = useMemo((): MfiChartData[] => {
    if (!deals || deals.length === 0) return [];

    let mfiData = mfi.init(deals[0], 14);

    return deals
      .map((deal, i) => {
        if (i > 0) {
          mfiData = mfi.next(deal, mfiData, 14);
        }

        // Simple SMA 20 for Price and Volume
        let ma20: number | null = null;
        let ma10: number | null = null;
        let volMa20: number | null = null;

        if (i >= 19) {
          let sumC = 0;
          let sumV = 0;
          for (let j = 0; j < 20; j++) {
            sumC += deals[i - j].c || 0;
            sumV += deals[i - j].v || 0;
          }
          ma20 = sumC / 20;
          volMa20 = sumV / 20;
        }

        if (i >= 9) {
          let sumC = 0;
          for (let j = 0; j < 10; j++) {
            sumC += deals[i - j].c || 0;
          }
          ma10 = sumC / 10;
        }

        return {
          ...deal,
          mfi: mfiData.mfi,
          ma20,
          ma10,
          volMa20,
        };
      })
      .slice(-180);
  }, [deals]);

  const { steps, score, recommendation } = useMemo(() => {
    if (chartData.length === 0)
      return { steps: [], score: 0, recommendation: "" };

    const current = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2] || current;

    const isNum = (n: any): n is number => typeof n === "number";

    const price = current.c;
    const mfiVal = current.mfi;
    const ma = current.ma20;
    const vol = current.v;
    const volMa = current.volMa20;

    if (
      !isNum(price) ||
      !isNum(mfiVal) ||
      !isNum(ma) ||
      !isNum(vol) ||
      !isNum(volMa)
    ) {
      return { steps: [], score: 0, recommendation: "Data Error" };
    }

    // I. Regime
    const volRatio = vol / volMa;
    const isVolStable = volRatio > 0.6; // Not dead volume
    const maRising = ma > (prev.ma20 || 0);
    const trendStatus = maRising ? "Uptrend" : "Downtrend/Flat";

    // II. Entry
    const isOversold = mfiVal < 20;
    const isOverbought = mfiVal > 80;
    const mfiRising = mfiVal > (prev.mfi || 0);

    // III. Risk
    const stopLoss = (price * 0.97).toFixed(2); // 3% trail or recent low

    // Score
    let totalScore = 0;
    // 1. Volume (20)
    if (isVolStable) totalScore += 20;
    // 2. Trend (20)
    if (maRising || price > ma) totalScore += 20;
    // 3. MFI Position (40)
    if (isOversold && mfiRising) totalScore += 40; // Perfect buy setup
    else if (mfiVal > 40 && mfiVal < 60 && mfiRising && price > ma)
      totalScore += 30; // Momentum continuation
    else if (isOverbought) totalScore -= 20; // Warning
    // 4. Price Action (20)
    if (price > (current.o || 0)) totalScore += 20; // Green candle

    if (totalScore < 0) totalScore = 0;

    let rec = "Reject";
    if (totalScore >= 80) rec = "Strong Buy";
    else if (totalScore >= 60) rec = "Watch";
    else if (isOverbought) rec = "Sell/Exit";
    else rec = "Neutral";

    const mfiSteps: MfiStep[] = [
      {
        label: "I. 市場環境",
        description: "流動性與趨勢 (Regime)",
        checks: [
          {
            label: `成交量穩定 (>60% MA): ${(volRatio * 100).toFixed(0)}%`,
            status: isVolStable ? "pass" : "fail",
          },
          {
            label: `趨勢方向 (MA20): ${trendStatus}`,
            status: maRising ? "pass" : "manual",
          },
          { label: "波動度正常 (ATR)", status: "manual" },
        ],
      },
      {
        label: "II. 入場條件",
        description: "超賣反轉或動能 (Entry)",
        checks: [
          {
            label: `MFI < 20 (超賣): ${mfiVal.toFixed(1)}`,
            status: isOversold ? "pass" : mfiVal < 30 ? "manual" : "fail",
          },
          {
            label: "MFI 低點抬高 (Turn Up)",
            status: mfiVal > (prev.mfi || 0) ? "pass" : "fail",
          },
          { label: "價格未跌破前低", status: "manual" },
        ],
      },
      {
        label: "III. 風險控管",
        description: "停損與部位 (Risk)",
        checks: [
          { label: `建議停損: ${stopLoss}`, status: "manual" },
          {
            label: "MFI 極端值減倉 (<15/>85)",
            status: mfiVal < 15 || mfiVal > 85 ? "fail" : "pass",
          },
          { label: "單筆風險 < 1.2%", status: "manual" },
        ],
      },
      {
        label: "IV. 綜合評估",
        description: `得分: ${totalScore} - ${rec}`,
        checks: [
          {
            label: "趨勢動能強 (MFI > 50 & Rising)",
            status: mfiVal > 50 && mfiRising ? "pass" : "fail",
          },
          { label: "無頂部背離 (Bearish Div)", status: "manual" },
          { label: "量價配合", status: isVolStable ? "pass" : "manual" },
        ],
      },
    ];

    return { steps: mfiSteps, score: totalScore, recommendation: rec };
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
          <Typography variant="h6" component="div">
            MFI Professional
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
        {/* Price Chart */}
        <ResponsiveContainer width="100%" height="60%">
          <ComposedChart data={chartData} syncId="mfiSync">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" hide />
            <YAxis domain={["auto", "auto"]} />
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
              stroke="#000"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="c"
              stroke="#000"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="l"
              stroke="#000"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="o"
              stroke="#000"
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
          </ComposedChart>
        </ResponsiveContainer>

        {/* MFI Chart */}
        <ResponsiveContainer width="100%" height="40%">
          <ComposedChart data={chartData} syncId="mfiSync">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" />
            <YAxis domain={[0, 100]} ticks={[0, 20, 50, 80, 100]} />
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
            <ReferenceLine
              y={80}
              stroke="#f44336"
              strokeDasharray="3 3"
              label={{ value: "Overbought", fill: "#f44336", fontSize: 10 }}
            />
            <ReferenceLine
              y={20}
              stroke="#4caf50"
              strokeDasharray="3 3"
              label={{ value: "Oversold", fill: "#4caf50", fontSize: 10 }}
            />
            <ReferenceLine y={50} stroke="#666" strokeDasharray="3 3" />

            <Line
              dataKey="mfi"
              stroke="#2196f3"
              dot={false}
              activeDot={false}
              strokeWidth={2}
              name="MFI"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}

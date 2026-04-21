import {
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { Reorder } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CategoryType } from "../../../../types";
import { CategoryPill, PremiumHeader } from "../styles";

interface HeaderProps {
  categories: CategoryType[];
  activeId: string | null;
  count: number;
  activeName: string;
  onSelect: (id: string) => void;
  onAddClick: () => void;
  onManageClick: () => void;
  onReorder: (newCategories: CategoryType[]) => void;
}

export default function Header({
  categories,
  activeId,
  count,
  activeName,
  onSelect,
  onAddClick,
  onManageClick,
  onReorder,
}: HeaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollInterval = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [categories]);

  const startScrolling = (direction: "left" | "right") => {
    if (scrollInterval.current) return;

    const scroll = () => {
      if (scrollRef.current) {
        const speed = 6;
        scrollRef.current.scrollLeft += direction === "right" ? speed : -speed;
        scrollInterval.current = requestAnimationFrame(scroll);
      }
    };
    scrollInterval.current = requestAnimationFrame(scroll);
  };

  const stopScrolling = () => {
    if (scrollInterval.current) {
      cancelAnimationFrame(scrollInterval.current);
      scrollInterval.current = null;
    }
  };

  return (
    <PremiumHeader>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
        mb={4}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight="900"
            sx={{ letterSpacing: "-1px" }}
          >
            自選分類
          </Typography>
          <Typography
            variant="body1"
            sx={{ opacity: 0.5, fontWeight: 500, mt: 0.5 }}
          >
            {activeId
              ? `${activeName} · ${count} 檔標的`
              : "選擇分類開始管理您的自選名單"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <IconButton
            onClick={onAddClick}
            sx={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              "&:hover": { background: "rgba(255,255,255,0.08)" },
            }}
          >
            <AddIcon sx={{ fontSize: "1.4rem" }} />
          </IconButton>
          <IconButton
            onClick={onManageClick}
            sx={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              "&:hover": { background: "rgba(255,255,255,0.08)" },
            }}
          >
            <SettingsIcon sx={{ fontSize: "1.4rem" }} />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ position: "relative", width: "100%" }}>
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <Box
            onMouseEnter={() => startScrolling("left")}
            onMouseLeave={stopScrolling}
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 8,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              px: 0.5,
              background: "linear-gradient(to right, #FDF8F2 20%, transparent)",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            <IconButton
              size="small"
              sx={{
                background: "rgba(61, 90, 69, 0.15)",
                backdropFilter: "blur(4px)",
                color: "#3D5A45",
                "&:hover": { background: "rgba(61, 90, 69, 0.25)" },
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <Box
            onMouseEnter={() => startScrolling("right")}
            onMouseLeave={stopScrolling}
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 8,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              px: 0.5,
              background: "linear-gradient(to left, #FDF8F2 20%, transparent)",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            <IconButton
              size="small"
              sx={{
                background: "rgba(61, 90, 69, 0.15)",
                backdropFilter: "blur(4px)",
                color: "#3D5A45",
                "&:hover": { background: "rgba(61, 90, 69, 0.25)" },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        <Box
          ref={scrollRef}
          sx={{
            overflowX: "auto",
            pb: 1,
            px: 1,
            maskImage:
              "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)",
            "::-webkit-scrollbar": {
              display: "none",
            },
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <Reorder.Group
            axis="x"
            values={categories}
            onReorder={onReorder}
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "12px",
              listStyle: "none",
              padding: 0,
              margin: 0,
              width: "max-content",
            }}
          >
            {categories.map((c) => (
              <Reorder.Item
                key={c.id}
                value={c}
                style={{
                  display: "flex",
                  flexShrink: 0,
                }}
              >
                <CategoryPill
                  label={c.name}
                  active={activeId === c.id}
                  onClick={() => onSelect(c.id)}
                />
              </Reorder.Item>
            ))}
            {categories.length === 0 && (
              <Typography
                variant="body2"
                sx={{ opacity: 0.3, fontStyle: "italic", py: 1 }}
              >
                尚未建立分類，請點擊右方按鈕新增
              </Typography>
            )}
          </Reorder.Group>
        </Box>
      </Box>
    </PremiumHeader>
  );
}

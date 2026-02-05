import { useEffect, useMemo, useState } from "react";
import useStocksStore from "../../../store/Stock.store";
import { StockStoreType } from "../../../types";
import Header from "./components/Header";
import ManageDialogs from "./components/ManageDialogs";
import SearchPalette from "./components/SearchPalette";
import StockWorkspace from "./components/StockWorkspace";
import { PageContainer } from "./styles";

export default function Category() {
  const {
    categories,
    menu,
    addCategory,
    removeCategory,
    renameCategory,
    addStockToCategory,
    removeStockFromCategory,
  } = useStocksStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Initialization: Select first category if none active
  useEffect(() => {
    if (!activeId && categories.length > 0) {
      setActiveId(categories[0].id);
    }
  }, [categories, activeId]);

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === activeId) || null;
  }, [categories, activeId]);

  const currentStocks = useMemo(() => {
    if (!currentCategory) return [];
    return currentCategory.stockIds
      .map((id) => menu.find((s) => s.id === id))
      .filter((s): s is StockStoreType => s !== undefined);
  }, [currentCategory, menu]);

  return (
    <PageContainer>
      <Header
        categories={categories}
        activeId={activeId}
        count={currentStocks.length}
        activeName={currentCategory?.name || ""}
        onSelect={setActiveId}
        onAddClick={() => setIsAddCatOpen(true)}
        onManageClick={() => setIsManageOpen(true)}
      />

      {currentCategory && (
        <SearchPalette
          menu={menu}
          onAddStock={(stockId) =>
            addStockToCategory(currentCategory.id, stockId)
          }
        />
      )}

      <StockWorkspace
        stocks={currentStocks}
        hasCategory={!!currentCategory}
        onRemoveStock={(stockId) =>
          currentCategory &&
          removeStockFromCategory(currentCategory.id, stockId)
        }
      />

      <ManageDialogs
        categories={categories}
        isAddOpen={isAddCatOpen}
        isManageOpen={isManageOpen}
        onAddClose={() => setIsAddCatOpen(false)}
        onManageClose={() => setIsManageOpen(false)}
        onAddCategory={addCategory}
        onRenameCategory={renameCategory}
        onRemoveCategory={removeCategory}
      />
    </PageContainer>
  );
}

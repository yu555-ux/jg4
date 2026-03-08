import React, { useState } from 'react';
import ShopItemDetail from './shop/ShopItemDetail';
import ShopItemEditor from './shop/ShopItemEditor';
import ShopListView from './shop/ShopListView';
import ShopRefreshPanel from './shop/ShopRefreshPanel';
import ShopReviewModal from './shop/ShopReviewModal';
import { useShopRefresh } from './shop/useShopRefresh';

interface ShopModalProps {
  data: any;
  onUpdateShopItem?: (item: any) => void;
  onReplaceShopItems?: (items: any[]) => void;
  isEditingAll: boolean;
  setIsEditingAll: (val: boolean) => void;
  onAddCommand?: (name: string, prompt: string) => void;
  shopApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  multiApiEnabled?: boolean;
}

const ShopModal: React.FC<ShopModalProps> = ({
  data,
  onUpdateShopItem,
  onReplaceShopItems,
  isEditingAll,
  setIsEditingAll,
  onAddCommand: _onAddCommand,
  shopApiConfig,
  multiApiEnabled,
}) => {
  const [shopCategory, setShopCategory] = useState('功法');
  const [subCategory, setSubCategory] = useState('全部');
  const [selectedShopItem, setSelectedShopItem] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    isRefreshing,
    setIsRefreshing,
    isGenerating,
    refreshTypes,
    refreshCount,
    refreshKeyword,
    eroticCount,
    eroticKeyword,
    rankSelections,
    mustHaveEnabled,
    mustHaveSimple,
    mustHaveForm,
    fixError,
    showReviewModal,
    reviewExistingItems,
    orderedReviewItems,
    applyMode,
    setApplyMode,
    replaceSelections,
    setReplaceSelections,
    toggleRefreshType,
    updateReviewItem,
    autoFixReviewItems,
    handleReviewConfirm,
    handleQuickRefresh,
    setRefreshCount,
    setRefreshKeyword,
    setEroticCount,
    setEroticKeyword,
    setRankSelections,
    setMustHaveEnabled,
    setMustHaveSimple,
    setMustHaveForm,
    setShowReviewModal,
    setFixError,
    categories,
    itemCategories,
  } = useShopRefresh({
    data,
    onReplaceShopItems,
    setIsEditingAll,
    shopApiConfig,
    multiApiEnabled,
  });

  const handleCategoryChange = (category: string) => {
    setShopCategory(category);
    if (category === '着装') {
      setSubCategory('全部');
    } else {
      setSubCategory('全部');
    }
    setCurrentPage(1);
  };

  const handleSubCategoryChange = (category: string) => {
    setSubCategory(category);
    setCurrentPage(1);
  };

  if (selectedShopItem) {
    if (isEditingAll) {
      return (
        <ShopItemEditor
          item={selectedShopItem}
          onCancel={() => setIsEditingAll(false)}
          onSave={updatedItem => {
            setSelectedShopItem(updatedItem);
            onUpdateShopItem?.(updatedItem);
            setIsEditingAll(false);
          }}
        />
      );
    }

    return (
      <ShopItemDetail
        item={selectedShopItem}
        onBack={() => setSelectedShopItem(null)}
        onEdit={() => setIsEditingAll(true)}
      />
    );
  }

  if (isRefreshing) {
    return (
      <ShopRefreshPanel
        categories={categories}
        itemCategories={itemCategories}
        isGenerating={isGenerating}
        refreshTypes={refreshTypes}
        refreshCount={refreshCount}
        refreshKeyword={refreshKeyword}
        eroticCount={eroticCount}
        eroticKeyword={eroticKeyword}
        rankSelections={rankSelections}
        mustHaveEnabled={mustHaveEnabled}
        mustHaveSimple={mustHaveSimple}
        mustHaveForm={mustHaveForm}
        onClose={() => setIsRefreshing(false)}
        onToggleRefreshType={toggleRefreshType}
        onRefreshCountChange={setRefreshCount}
        onRefreshKeywordChange={setRefreshKeyword}
        onEroticCountChange={setEroticCount}
        onEroticKeywordChange={setEroticKeyword}
        onRankSelectionsChange={setRankSelections}
        onToggleMustHave={() => setMustHaveEnabled(prev => !prev)}
        onToggleMustHaveSimple={() => setMustHaveSimple(prev => !prev)}
        onMustHaveFormChange={setMustHaveForm}
        onQuickRefresh={handleQuickRefresh}
      />
    );
  }

  return (
    <>
      <ShopListView
        data={data}
        shopCategory={shopCategory}
        subCategory={subCategory}
        currentPage={currentPage}
        onSelectItem={setSelectedShopItem}
        onCategoryChange={handleCategoryChange}
        onSubCategoryChange={handleSubCategoryChange}
        onPageChange={setCurrentPage}
        onOpenRefresh={() => setIsRefreshing(true)}
      />
      <ShopReviewModal
        show={showReviewModal}
        fixError={fixError}
        orderedReviewItems={orderedReviewItems}
        reviewExistingItems={reviewExistingItems}
        applyMode={applyMode}
        onApplyModeChange={setApplyMode}
        replaceSelections={replaceSelections}
        onReplaceSelectionsChange={setReplaceSelections}
        itemCategories={itemCategories}
        onClose={() => {
          setShowReviewModal(false);
          setFixError('');
        }}
        onUpdateReviewItem={updateReviewItem}
        onAutoFix={autoFixReviewItems}
        onConfirm={handleReviewConfirm}
      />
    </>
  );
};

export default ShopModal;

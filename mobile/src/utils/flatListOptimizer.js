export const getFlatListOptimizations = () => {
  return {
    removeClippedSubviews: true,
    windowSize: 10,
    initialNumToRender: 10,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    onEndReachedThreshold: 0.5,
    scrollEventThrottle: 16,
    maintainVisibleContentPosition: {
      minIndexForVisible: 0
    }
  };
};

export const getItemLayout = (itemHeight, separatorHeight = 0) => {
  return (data, index) => {
    return {
      length: itemHeight + separatorHeight,
      offset: (itemHeight + separatorHeight) * index,
      index,
    };
  };
};

export const getKeyExtractor = (item, index) => {
  return item?._id || item?.id || `item_${index}`;
};

export const memoizeRenderItem = (renderItem) => {
  const cache = new Map();
  
  return (props) => {
    const key = props.item?._id || props.item?.id || props.index;
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = renderItem(props);
    cache.set(key, result);
    
    return result;
  };
};


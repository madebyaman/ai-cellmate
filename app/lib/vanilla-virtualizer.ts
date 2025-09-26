// Constants
const ROW_HEIGHT = 45;
const OVERSCAN = 5;
const MOBILE_BREAKPOINT = 768;

export interface VirtualizerConfig {
  containerHeight: number;
  rowHeight?: number;
  overscan?: number;
  onRowRender: (
    node: HTMLDivElement,
    rowData: string[],
    rowIndex: number,
    isMobile: boolean,
  ) => void;
}

export interface VirtualizerState {
  totalItems: number;
  visibleCount: number;
  startIndex: number;
  endIndex: number;
  overscanStart: number;
  overscanEnd: number;
  spacerHeight: number;
}

export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

export interface CSVData {
  headers: string[];
  rows: string[][];
}

export interface CellPool {
  rowNumberCell: HTMLDivElement;
  dataCells: HTMLDivElement[];
  linkElements: HTMLAnchorElement[];
  textElements: HTMLDivElement[];
  emptyElements: HTMLSpanElement[];
}

export class VanillaVirtualizer {
  private config: VirtualizerConfig;
  private state: VirtualizerState;
  private csvData: CSVData | null = null;
  private isMobile: boolean = false;

  // DOM elements
  private scrollContainer: HTMLDivElement | null = null;
  private spacer: HTMLDivElement | null = null;
  private rowContainer: HTMLDivElement | null = null;
  private pooledNodes: HTMLDivElement[] = [];

  // Node tracking for optimization
  private nodeDataMap: Map<HTMLDivElement, number> = new Map();
  private renderedRange: { start: number; end: number } = {
    start: -1,
    end: -1,
  };

  // Cell component pooling for performance
  private cellPools: Map<HTMLDivElement, CellPool> = new Map();

  // RAF and event handling
  private scrollRAF: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Auto scroll
  private autoScrollRAF: number | null = null;
  private isAutoScrolling: boolean = false;

  // Measurements and dynamic sizing
  private itemSizeCache = new Map<number, number>();
  private measurementsCache: VirtualItem[] = [];
  private itemResizeObserver: ResizeObserver | null = null;

  constructor(config: VirtualizerConfig) {
    this.config = {
      rowHeight: ROW_HEIGHT,
      overscan: OVERSCAN,
      ...config,
    };

    this.state = {
      totalItems: 0,
      visibleCount: 0,
      startIndex: 0,
      endIndex: 0,
      overscanStart: 0,
      overscanEnd: 0,
      spacerHeight: 0,
    };

    this.checkMobile();
    this.setupResizeObserver();
    this.setupItemResizeObserver();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.checkMobile();
      if (this.csvData) {
        this.updateVirtualizedView();
      }
    });

    // Observe window resizing
    if (typeof window !== "undefined") {
      window.addEventListener("resize", () => this.checkMobile());
    }
  }

  private setupItemResizeObserver(): void {
    if (typeof window === "undefined" || !window.ResizeObserver) {
      return;
    }

    this.itemResizeObserver = new ResizeObserver((entries) => {
      let hasChanges = false;

      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        const indexAttr = element.getAttribute('data-index');

        if (indexAttr) {
          const index = parseInt(indexAttr, 10);
          const newSize = entry.borderBoxSize?.[0]?.blockSize || element.offsetHeight;
          const oldSize = this.itemSizeCache.get(index);

          if (oldSize !== newSize) {
            this.itemSizeCache.set(index, newSize);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        this.invalidateMeasurements();
        this.updateVirtualizedView();
      }
    });
  }

  public initialize(
    scrollContainer: HTMLDivElement,
    spacer: HTMLDivElement,
    rowContainer: HTMLDivElement,
    csvData: CSVData,
  ): void {
    this.scrollContainer = scrollContainer;
    this.spacer = spacer;
    this.rowContainer = rowContainer;
    this.csvData = csvData;

    this.calculateDimensions();
    this.createPooledNodes();
    this.updateVirtualizedView();
    this.attachScrollListener();

    if (this.resizeObserver && this.scrollContainer) {
      this.resizeObserver.observe(this.scrollContainer);
    }
  }

  private calculateDimensions(): void {
    if (!this.csvData) return;

    const totalItems = this.csvData.rows.length;
    const visibleCount = Math.ceil(
      this.config.containerHeight / this.config.rowHeight!,
    );
    const spacerHeight = totalItems * this.config.rowHeight!;

    // Update spacer height
    if (this.spacer) {
      this.spacer.style.height = `${spacerHeight}px`;
    }

    // Update state
    this.state.totalItems = totalItems;
    this.state.visibleCount = visibleCount;
    this.state.spacerHeight = spacerHeight;
  }

  private createPooledNodes(): void {
    if (!this.rowContainer) return;

    // Clear existing nodes and tracking data
    this.pooledNodes.forEach((node) => {
      node.style.visibility = 'hidden';
    });
    this.nodeDataMap.clear();
    this.renderedRange = { start: -1, end: -1 };

    // Only create new nodes if pool size needs to change
    const newPoolSize = this.state.visibleCount + 2 * this.config.overscan!;
    const currentPoolSize = this.pooledNodes.length;

    if (newPoolSize > currentPoolSize) {
      // Add more nodes to the pool
      for (let i = currentPoolSize; i < newPoolSize; i++) {
        const node = document.createElement("div");
        node.className =
          "flex hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 absolute top-0 left-0 w-full";
        node.style.height = `${this.config.rowHeight}px`;
        node.style.visibility = 'hidden';
        this.rowContainer.appendChild(node);
        this.pooledNodes.push(node);

        // Create cell pool for this node
        this.createCellPoolForNode(node);
      }
    } else if (newPoolSize < currentPoolSize) {
      // Remove excess nodes from the pool
      const excessNodes = this.pooledNodes.splice(newPoolSize);
      excessNodes.forEach(node => {
        this.cleanupCellPool(node);
        node.remove();
      });
    }

    // Reset all existing nodes to clean state
    this.pooledNodes.forEach(node => {
      node.style.visibility = 'hidden';
      node.innerHTML = '';
    });
  }

  private createCellPoolForNode(node: HTMLDivElement): void {
    if (!this.csvData) return;

    const maxColumns = this.csvData.headers.length;
    const isMobile = this.isMobile;

    // Create row number cell
    const rowNumberCell = document.createElement("div");
    rowNumberCell.className = `px-2 md:px-4 py-3 text-xs md:text-sm text-gray-500 text-center font-mono ${
      isMobile ? "w-12" : "w-16"
    } border-r border-gray-200 flex items-center justify-center`;

    // Pre-create data cells with minimal elements - create content elements on demand
    const dataCells: HTMLDivElement[] = [];

    for (let i = 0; i < maxColumns; i++) {
      // Data cell container - only create the container
      const cellDiv = document.createElement("div");
      cellDiv.className = `px-2 md:px-4 py-3 text-xs md:text-sm border-r border-gray-200 ${
        isMobile ? "min-w-[100px]" : "min-w-[120px]"
      } flex-1 flex items-center`;

      dataCells.push(cellDiv);
    }

    // Store simplified pool - content elements created on demand
    this.cellPools.set(node, {
      rowNumberCell,
      dataCells,
      linkElements: [], // These will be created on demand
      textElements: [], // These will be created on demand
      emptyElements: [], // These will be created on demand
    });
  }

  private attachScrollListener(): void {
    if (!this.scrollContainer) return;

    const handleScroll = () => {
      if (this.scrollRAF) {
        cancelAnimationFrame(this.scrollRAF);
      }

      this.scrollRAF = requestAnimationFrame(() => {
        if (!this.scrollContainer) return;

        const scrollTop = this.scrollContainer.scrollTop;
        const newStartIndex = Math.floor(scrollTop / this.config.rowHeight!);

        if (newStartIndex !== this.state.startIndex) {
          this.updateVirtualizedView(scrollTop);
        }
      });
    };

    this.scrollContainer.addEventListener("scroll", handleScroll, {
      passive: true,
    });
  }

  private updateVirtualizedView(scrollTop?: number): void {
    if (!this.csvData || !this.scrollContainer) return;

    const currentScrollTop = scrollTop ?? this.scrollContainer.scrollTop;
    const startIndex = Math.floor(currentScrollTop / this.config.rowHeight!);
    const endIndex = Math.min(
      startIndex + this.state.visibleCount - 1,
      this.state.totalItems - 1,
    );

    // Apply overscan
    const overscanStart = Math.max(0, startIndex - this.config.overscan!);
    const overscanEnd = Math.min(
      this.state.totalItems - 1,
      endIndex + this.config.overscan!,
    );

    // Check if range has changed significantly to warrant updates
    const rangeChanged =
      this.renderedRange.start !== overscanStart ||
      this.renderedRange.end !== overscanEnd;

    if (!rangeChanged) {
      // Update state but skip DOM manipulations if range hasn't changed
      this.state.startIndex = startIndex;
      this.state.endIndex = endIndex;
      this.state.overscanStart = overscanStart;
      this.state.overscanEnd = overscanEnd;
      return;
    }

    // Update state
    this.state.startIndex = startIndex;
    this.state.endIndex = endIndex;
    this.state.overscanStart = overscanStart;
    this.state.overscanEnd = overscanEnd;
    this.renderedRange = { start: overscanStart, end: overscanEnd };

    // Track which nodes are currently in use
    const visibleIndexes = new Set<number>();
    for (let i = overscanStart; i <= overscanEnd; i++) {
      visibleIndexes.add(i);
    }

    // Update all pooled nodes
    this.pooledNodes.forEach(node => {
      const currentDataIndex = this.nodeDataMap.get(node);

      if (currentDataIndex !== undefined && visibleIndexes.has(currentDataIndex)) {
        // Node is visible - ensure it's positioned correctly and visible
        const yPosition = this.getItemOffset(currentDataIndex);
        node.style.transform = `translateY(${yPosition}px)`;
        node.style.visibility = 'visible';
        node.setAttribute('data-index', currentDataIndex.toString());

        // Observe for size changes if not already observing
        if (this.itemResizeObserver && !this.itemSizeCache.has(currentDataIndex)) {
          this.itemResizeObserver.observe(node);
        }

        // Update content
        const row = this.csvData.rows[currentDataIndex];
        this.config.onRowRender(node, row, currentDataIndex, this.isMobile);
      } else {
        // Node is not visible - hide it but keep in DOM
        node.style.visibility = 'hidden';

        // Clear data association if outside range
        if (currentDataIndex !== undefined && !visibleIndexes.has(currentDataIndex)) {
          this.nodeDataMap.delete(node);
        }
      }
    });

    // Assign available nodes to visible indexes that don't have nodes yet
    const unassignedIndexes: number[] = [];
    const availableNodes: HTMLDivElement[] = [];

    for (let i = overscanStart; i <= overscanEnd; i++) {
      const hasAssignedNode = Array.from(this.nodeDataMap.entries())
        .some(([node, index]) => index === i);

      if (!hasAssignedNode) {
        unassignedIndexes.push(i);
      }
    }

    // Find nodes that are not assigned to any visible index
    this.pooledNodes.forEach(node => {
      const currentDataIndex = this.nodeDataMap.get(node);
      if (currentDataIndex === undefined || !visibleIndexes.has(currentDataIndex)) {
        availableNodes.push(node);
      }
    });

    // Assign available nodes to unassigned indexes
    const assignmentCount = Math.min(unassignedIndexes.length, availableNodes.length);
    for (let i = 0; i < assignmentCount; i++) {
      const node = availableNodes[i];
      const dataIndex = unassignedIndexes[i];
      const row = this.csvData.rows[dataIndex];

      // Position and show the node
      const yPosition = this.getItemOffset(dataIndex);
      node.style.transform = `translateY(${yPosition}px)`;
      node.style.visibility = 'visible';
      node.setAttribute('data-index', dataIndex.toString());

      // Track this node's data index
      this.nodeDataMap.set(node, dataIndex);

      // Observe for size changes if not already observing
      if (this.itemResizeObserver && !this.itemSizeCache.has(dataIndex)) {
        this.itemResizeObserver.observe(node);
      }

      // Update content
      this.config.onRowRender(node, row, dataIndex, this.isMobile);
    }
  }

  public updateData(csvData: CSVData): void {
    this.csvData = csvData;
    this.calculateDimensions();

    // Clear tracking data since data has changed
    this.nodeDataMap.clear();
    this.renderedRange = { start: -1, end: -1 };

    // Update pool size if needed (this will preserve existing nodes when possible)
    this.createPooledNodes();

    this.updateVirtualizedView();
  }

  public scrollToTop(): void {
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = 0;
    }
  }

  public scrollToIndex(index: number): void {
    if (this.scrollContainer) {
      const scrollTop = index * this.config.rowHeight!;
      this.scrollContainer.scrollTop = scrollTop;
    }
  }

  public findItemForOffset(offset: number): number {
    if (!this.csvData) return 0;

    // For uniform row heights, we can calculate directly
    return Math.floor(offset / this.config.rowHeight!);
  }

  private getItemOffset(index: number): number {
    // If we have measured sizes, use cumulative calculation
    if (this.measurementsCache.length > index) {
      return this.measurementsCache[index].start;
    }

    // Fallback to uniform calculation
    return index * this.config.rowHeight!;
  }

  private getItemSize(index: number): number {
    return this.itemSizeCache.get(index) || this.config.rowHeight!;
  }

  private invalidateMeasurements(): void {
    // Recalculate measurements cache when item sizes change
    if (!this.csvData) return;

    this.measurementsCache = [];
    let offset = 0;

    for (let i = 0; i < this.csvData.rows.length; i++) {
      const size = this.getItemSize(i);
      const item: VirtualItem = {
        index: i,
        start: offset,
        end: offset + size,
        size
      };

      this.measurementsCache.push(item);
      offset += size;
    }

    // Update spacer height based on new measurements
    if (this.spacer && this.measurementsCache.length > 0) {
      const lastItem = this.measurementsCache[this.measurementsCache.length - 1];
      this.spacer.style.height = `${lastItem.end}px`;
      this.state.spacerHeight = lastItem.end;
    }
  }

  public getState(): Readonly<VirtualizerState> {
    return { ...this.state };
  }

  public startAutoScroll(): void {
    if (this.isAutoScrolling || !this.scrollContainer) return;

    this.isAutoScrolling = true;
    let direction = "down";
    let scrollSpeed = 100;

    const scroll = () => {
      if (!this.scrollContainer || !this.isAutoScrolling) return;

      const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer;

      if (direction === "down") {
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          direction = "up";
        } else {
          this.scrollContainer.scrollTop += scrollSpeed;
        }
      } else {
        if (scrollTop <= 10) {
          direction = "down";
        } else {
          this.scrollContainer.scrollTop -= scrollSpeed;
        }
      }

      this.autoScrollRAF = requestAnimationFrame(scroll);
    };

    this.autoScrollRAF = requestAnimationFrame(scroll);
  }

  public stopAutoScroll(): void {
    this.isAutoScrolling = false;
    if (this.autoScrollRAF) {
      cancelAnimationFrame(this.autoScrollRAF);
      this.autoScrollRAF = null;
    }
  }

  public toggleAutoScroll(): boolean {
    if (this.isAutoScrolling) {
      this.stopAutoScroll();
    } else {
      this.startAutoScroll();
    }
    return this.isAutoScrolling;
  }

  public getAutoScrollState(): boolean {
    return this.isAutoScrolling;
  }

  public getCellPool(node: HTMLDivElement): CellPool | undefined {
    return this.cellPools.get(node);
  }

  private cleanupCellPool(node: HTMLDivElement): void {
    const cellPool = this.cellPools.get(node);
    if (cellPool) {
      // Remove all pooled elements from their parent nodes
      const allElements = [
        cellPool.rowNumberCell,
        ...cellPool.dataCells,
        ...cellPool.linkElements,
        ...cellPool.textElements,
        ...cellPool.emptyElements,
      ];

      allElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      this.cellPools.delete(node);
    }
  }

  public destroy(): void {
    // Stop auto scroll
    this.stopAutoScroll();

    // Cancel any pending RAF
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
      this.scrollRAF = null;
    }

    // Disconnect resize observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.itemResizeObserver) {
      this.itemResizeObserver.disconnect();
      this.itemResizeObserver = null;
    }

    // Remove window listener
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", () => this.checkMobile());
    }

    // Clean up DOM nodes and tracking data
    this.pooledNodes.forEach((node) => {
      this.cleanupCellPool(node);
      node.remove();
    });
    this.pooledNodes = [];
    this.nodeDataMap.clear();
    this.cellPools.clear();
    this.renderedRange = { start: -1, end: -1 };
    this.itemSizeCache.clear();
    this.measurementsCache = [];

    // Clear references
    this.scrollContainer = null;
    this.spacer = null;
    this.rowContainer = null;
    this.csvData = null;
  }
}

// Utility function to create row content using pooled components
export function createOptimizedRowRenderer(
  virtualizer: VanillaVirtualizer,
  csvData: CSVData,
) {
  return (
    node: HTMLDivElement,
    row: string[],
    rowIndex: number,
    isMobile: boolean,
  ): void => {
    // Get the pre-built cell pool for this node
    const cellPool = virtualizer.getCellPool(node);
    if (!cellPool) {
      // Fallback to traditional method if pool not found
      return createDefaultRowRenderer(csvData)(node, row, rowIndex, isMobile);
    }

    const { rowNumberCell, dataCells, linkElements, textElements, emptyElements } = cellPool;

    // Only rebuild DOM structure if it doesn't exist
    if (node.children.length === 0) {
      // Initial setup - add all cells to DOM
      node.appendChild(rowNumberCell);
      dataCells.forEach(cellDiv => {
        node.appendChild(cellDiv);
      });
    }

    // Update row number content only
    if (rowNumberCell.textContent !== (rowIndex + 1).toString()) {
      rowNumberCell.textContent = (rowIndex + 1).toString();
    }

    // Update data cells content efficiently with on-demand element creation
    row.forEach((cell, cellIndex) => {
      if (cellIndex >= dataCells.length) return; // Safety check

      const cellDiv = dataCells[cellIndex];

      // Determine what type of content we need
      const isUrl = cell && (cell.startsWith("http") || cell.includes("@"));
      const isEmpty = !cell;

      // Get or create appropriate content element on demand
      let contentElement: HTMLElement;
      let elementType: 'link' | 'text' | 'empty';

      if (isUrl) {
        elementType = 'link';
        // Get existing link element or create new one
        let linkElement = cellDiv.querySelector('a') as HTMLAnchorElement;
        if (!linkElement) {
          linkElement = document.createElement("a");
          linkElement.className = "text-blue-600 hover:text-blue-800 hover:underline";
          linkElement.target = "_blank";
          linkElement.rel = "noopener noreferrer";
          cellDiv.innerHTML = ""; // Clear before adding
          cellDiv.appendChild(linkElement);
        }
        contentElement = linkElement;
      } else if (!isEmpty) {
        elementType = 'text';
        // Get existing text div or create new one
        let textElement = cellDiv.querySelector('div:not(a)') as HTMLDivElement;
        if (!textElement || cellDiv.querySelector('a') || cellDiv.querySelector('span')) {
          textElement = document.createElement("div");
          textElement.className = "text-gray-900";
          cellDiv.innerHTML = ""; // Clear before adding
          cellDiv.appendChild(textElement);
        }
        contentElement = textElement;
      } else {
        elementType = 'empty';
        // Get existing empty span or create new one
        let emptyElement = cellDiv.querySelector('span') as HTMLSpanElement;
        if (!emptyElement) {
          emptyElement = document.createElement("span");
          emptyElement.className = "text-gray-400";
          emptyElement.textContent = "—";
          cellDiv.innerHTML = ""; // Clear before adding
          cellDiv.appendChild(emptyElement);
        }
        contentElement = emptyElement;
      }

      // Update content based on element type
      if (elementType === 'link') {
        const linkElement = contentElement as HTMLAnchorElement;
        if (linkElement.textContent !== cell) {
          linkElement.textContent = cell;
        }
        const newHref = cell.includes("@") ? `mailto:${cell}` : cell;
        if (linkElement.href !== newHref) {
          linkElement.href = newHref;
        }
      } else if (elementType === 'text') {
        const textElement = contentElement as HTMLDivElement;
        const maxLength = isMobile ? 30 : 50;
        const newClassName = `text-gray-900 ${
          cell.length > maxLength
            ? (isMobile ? "max-w-[100px]" : "max-w-xs") + " truncate"
            : ""
        }`;

        if (textElement.textContent !== cell) {
          textElement.textContent = cell;
        }
        if (textElement.title !== cell) {
          textElement.title = cell;
        }
        if (textElement.className !== newClassName) {
          textElement.className = newClassName;
        }
      }
      // Empty elements don't need content updates since they're static
    });
  };
}

// Utility function to create row content (traditional method - kept for backward compatibility)
export function createDefaultRowRenderer(csvData: CSVData) {
  return (
    node: HTMLDivElement,
    row: string[],
    rowIndex: number,
    isMobile: boolean,
  ): void => {
    // Clear existing content
    node.innerHTML = "";

    // Row number cell
    const rowNumberCell = document.createElement("div");
    rowNumberCell.className = `px-2 md:px-4 py-3 text-xs md:text-sm text-gray-500 text-center font-mono ${
      isMobile ? "w-12" : "w-16"
    } border-r border-gray-200 flex items-center justify-center`;
    rowNumberCell.textContent = (rowIndex + 1).toString();
    node.appendChild(rowNumberCell);

    // Data cells
    row.forEach((cell, cellIndex) => {
      const cellDiv = document.createElement("div");
      cellDiv.className = `px-2 md:px-4 py-3 text-xs md:text-sm border-r border-gray-200 ${
        isMobile ? "min-w-[100px]" : "min-w-[120px]"
      } flex-1 flex items-center`;

      if (cell) {
        const isUrl = cell.startsWith("http") || cell.includes("@");

        if (isUrl) {
          const link = document.createElement("a");
          link.className = "text-blue-600 hover:text-blue-800 hover:underline";
          link.textContent = cell;

          if (cell.includes("@")) {
            link.href = `mailto:${cell}`;
          } else {
            link.href = cell;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }

          cellDiv.appendChild(link);
        } else {
          const textDiv = document.createElement("div");
          const maxLength = isMobile ? 30 : 50;
          textDiv.className = `text-gray-900 ${
            cell.length > maxLength
              ? (isMobile ? "max-w-[100px]" : "max-w-xs") + " truncate"
              : ""
          }`;
          textDiv.textContent = cell;
          textDiv.title = cell;
          cellDiv.appendChild(textDiv);
        }
      } else {
        const emptySpan = document.createElement("span");
        emptySpan.className = "text-gray-400";
        emptySpan.textContent = "—";
        cellDiv.appendChild(emptySpan);
      }

      node.appendChild(cellDiv);
    });
  };
}

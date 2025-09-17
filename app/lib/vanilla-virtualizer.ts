// Constants
const ROW_HEIGHT = 45;
const OVERSCAN = 5;
const MOBILE_BREAKPOINT = 768;

export interface VirtualizerConfig {
  containerHeight: number;
  rowHeight?: number;
  overscan?: number;
  onRowRender: (node: HTMLDivElement, rowData: string[], rowIndex: number, isMobile: boolean) => void;
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

export interface CSVData {
  headers: string[];
  rows: string[][];
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

  // RAF and event handling
  private scrollRAF: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Auto scroll
  private autoScrollRAF: number | null = null;
  private isAutoScrolling: boolean = false;

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
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.checkMobile());
    }
  }

  public initialize(
    scrollContainer: HTMLDivElement,
    spacer: HTMLDivElement,
    rowContainer: HTMLDivElement,
    csvData: CSVData
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
    const visibleCount = Math.ceil(this.config.containerHeight / this.config.rowHeight!);
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

    // Clear existing nodes
    this.pooledNodes.forEach(node => node.remove());
    this.pooledNodes = [];

    // Create new pooled nodes
    const poolSize = this.state.visibleCount + 2 * this.config.overscan!;
    for (let i = 0; i < poolSize; i++) {
      const node = document.createElement('div');
      node.className = 'flex hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 absolute top-0 left-0 w-full';
      node.style.height = `${this.config.rowHeight}px`;
      this.rowContainer.appendChild(node);
      this.pooledNodes.push(node);
    }
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

    this.scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  }

  private updateVirtualizedView(scrollTop?: number): void {
    if (!this.csvData || !this.scrollContainer) return;

    const currentScrollTop = scrollTop ?? this.scrollContainer.scrollTop;
    const startIndex = Math.floor(currentScrollTop / this.config.rowHeight!);
    const endIndex = Math.min(startIndex + this.state.visibleCount - 1, this.state.totalItems - 1);

    // Apply overscan
    const overscanStart = Math.max(0, startIndex - this.config.overscan!);
    const overscanEnd = Math.min(this.state.totalItems - 1, endIndex + this.config.overscan!);

    // Update state
    this.state.startIndex = startIndex;
    this.state.endIndex = endIndex;
    this.state.overscanStart = overscanStart;
    this.state.overscanEnd = overscanEnd;

    // Update visible nodes
    const itemsToRender = overscanEnd - overscanStart + 1;

    for (let i = 0; i < this.pooledNodes.length; i++) {
      const node = this.pooledNodes[i];

      if (i < itemsToRender) {
        const dataIndex = overscanStart + i;
        const row = this.csvData.rows[dataIndex];

        // Position the node
        node.style.transform = `translateY(${dataIndex * this.config.rowHeight!}px)`;
        node.style.display = 'flex';

        // Update content using the callback
        this.config.onRowRender(node, row, dataIndex, this.isMobile);
      } else {
        // Hide unused nodes
        node.style.display = 'none';
      }
    }
  }

  public updateData(csvData: CSVData): void {
    this.csvData = csvData;
    this.calculateDimensions();

    // Recreate nodes if pool size needs to change
    const newPoolSize = this.state.visibleCount + 2 * this.config.overscan!;
    if (newPoolSize !== this.pooledNodes.length) {
      this.createPooledNodes();
    }

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

  public destroy(): void {
    // Stop auto scroll
    this.stopAutoScroll();

    // Cancel any pending RAF
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
      this.scrollRAF = null;
    }

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove window listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', () => this.checkMobile());
    }

    // Clean up DOM nodes
    this.pooledNodes.forEach(node => node.remove());
    this.pooledNodes = [];

    // Clear references
    this.scrollContainer = null;
    this.spacer = null;
    this.rowContainer = null;
    this.csvData = null;
  }
}

// Utility function to create row content (can be used as default onRowRender)
export function createDefaultRowRenderer(csvData: CSVData) {
  return (node: HTMLDivElement, row: string[], rowIndex: number, isMobile: boolean): void => {
    // Clear existing content
    node.innerHTML = '';

    // Row number cell
    const rowNumberCell = document.createElement('div');
    rowNumberCell.className = `px-2 md:px-4 py-3 text-xs md:text-sm text-gray-500 text-center font-mono ${
      isMobile ? 'w-12' : 'w-16'
    } border-r border-gray-200 flex items-center justify-center`;
    rowNumberCell.textContent = (rowIndex + 1).toString();
    node.appendChild(rowNumberCell);

    // Data cells
    row.forEach((cell, cellIndex) => {
      const cellDiv = document.createElement('div');
      cellDiv.className = `px-2 md:px-4 py-3 text-xs md:text-sm border-r border-gray-200 ${
        isMobile ? 'min-w-[100px]' : 'min-w-[120px]'
      } flex-1 flex items-center`;

      if (cell) {
        const isUrl = cell.startsWith('http') || cell.includes('@');

        if (isUrl) {
          const link = document.createElement('a');
          link.className = 'text-blue-600 hover:text-blue-800 hover:underline';
          link.textContent = cell;

          if (cell.includes('@')) {
            link.href = `mailto:${cell}`;
          } else {
            link.href = cell;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }

          cellDiv.appendChild(link);
        } else {
          const textDiv = document.createElement('div');
          const maxLength = isMobile ? 30 : 50;
          textDiv.className = `text-gray-900 ${
            cell.length > maxLength
              ? (isMobile ? 'max-w-[100px]' : 'max-w-xs') + ' truncate'
              : ''
          }`;
          textDiv.textContent = cell;
          textDiv.title = cell;
          cellDiv.appendChild(textDiv);
        }
      } else {
        const emptySpan = document.createElement('span');
        emptySpan.className = 'text-gray-400';
        emptySpan.textContent = '—';
        cellDiv.appendChild(emptySpan);
      }

      node.appendChild(cellDiv);
    });
  };
}
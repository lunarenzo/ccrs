import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Table as BootstrapTable, Form, Pagination, Row, Col } from 'react-bootstrap';
import { classNames } from '../../lib/utils';

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  searchable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  striped?: boolean;
  hover?: boolean;
  responsive?: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  className = '',
  searchable = false,
  pagination = false,
  pageSize = 10,
  striped = true,
  hover = true,
  responsive = true
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter((row) =>
      columns.some((column) => {
        const value = row[column.key];
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return '↕️';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getPaginationItems = () => {
    const items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return items;
  };

  return (
    <div className={classNames('ccrs-table-container', className)}>
      {searchable && (
        <Row className="mb-3 align-items-center">
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="shadow-sm"
            />
          </Col>
          <Col md={6} className="text-end">
            <small className="text-ccrs-secondary">
              {sortedData.length} result{sortedData.length !== 1 ? 's' : ''}
            </small>
          </Col>
        </Row>
      )}

      <div className={responsive ? 'table-responsive' : ''}>
        <BootstrapTable 
          striped={striped} 
          hover={hover} 
          className={classNames('shadow-ccrs', className)}
        >
          <thead className="table-light">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={classNames(
                    'text-ccrs-primary fw-semibold',
                    column.sortable ? 'cursor-pointer user-select-none' : '',
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                  style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                >
                  <div className="d-flex align-items-center">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="ms-1 text-muted small">
                        {getSortIcon(String(column.key))}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={classNames('align-middle', column.className)}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </BootstrapTable>
      </div>

      {pagination && totalPages > 1 && (
        <Row className="mt-3 align-items-center">
          <Col md={6}>
            <small className="text-ccrs-secondary">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
            </small>
          </Col>
          <Col md={6} className="d-flex justify-content-end">
            <Pagination className="mb-0">
              <Pagination.First 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              />
              <Pagination.Prev
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              />
              {getPaginationItems()}
              <Pagination.Next
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              />
              <Pagination.Last 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          </Col>
        </Row>
      )}
    </div>
  );
}

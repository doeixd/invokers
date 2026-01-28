/**
 * Date helper functions for expressions
 * These can be imported separately to reduce bundle size
 */

export const dateHelpers = {
  // Current time
  now: (): Date => new Date(),

  // Date formatting
  formatDate: (date: Date | string | number, format = 'MM/dd/yyyy'): string => {
    try {
      let d: Date;

      // Handle string dates in YYYY-MM-DD format explicitly to avoid timezone issues
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, day] = date.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(date);
      }

      if (isNaN(d.getTime())) return '';

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      return format
        .replace(/yyyy/g, String(year))
        .replace(/MM/g, month)
        .replace(/dd/g, day);
    } catch {
      return '';
    }
  },

  // Relative time
  timeAgo: (date: Date | string | number): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  },
};

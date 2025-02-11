import {
  addDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfWeek,
} from 'date-fns';

import { timeGranularity } from '../mappers';

/**
 * Determines the end of the interval and label based on granularity.
 */
const getEndOfIntervalAndLabel = ({
  start,
  granularity,
}: {
  start: Date;
  granularity: keyof typeof timeGranularity;
}) => {
  const date = new Date(start);
  let end: Date;
  let label: string;

  switch (granularity) {
    case 'yearly':
      end = endOfYear(date);
      label = date.getFullYear().toString();
      break;
    case 'quarterly':
      end = endOfQuarter(date);
      label = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      break;
    case 'monthly':
      end = endOfMonth(date);
      label = format(date, 'yyyy-MM');
      break;
    case 'weeklyInitSunday':
      end = addDays(startOfWeek(date, { weekStartsOn: 0 }), 6);
      label = `Week of ${format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd')}`;
      break;
    case 'weeklyInitMonday':
      end = addDays(startOfWeek(date, { weekStartsOn: 1 }), 6);
      label = `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`;
      break;
    case 'weeklyISO8601':
      end = addDays(startOfWeek(date, { weekStartsOn: 1 }), 6);
      label = format(date, "yyyy-'W'II");
      break;
    case 'daily':
      end = date;
      label = format(date, 'yyyy-MM-dd');
      break;
    default:
      throw new Error(`Invalid granularity: ${granularity}`);
  }

  return { currentEnd: end, label };
};

/**
 * Generates time intervals based on the specified granularity.
 */
export const generateTimeIntervals = ({
  timeRange,
  granularity,
}: {
  timeRange: { start: Date; end: Date };
  granularity: keyof typeof timeGranularity;
}) => {
  const intervals = [];
  let currentStart = new Date(timeRange.start);

  while (currentStart <= timeRange.end) {
    const { currentEnd, label } = getEndOfIntervalAndLabel({
      start: currentStart,
      granularity,
    });
    intervals.push({ start: currentStart, end: currentEnd, label });
    currentStart = addDays(currentEnd, 1); // Advance to the next interval
  }

  return intervals;
};

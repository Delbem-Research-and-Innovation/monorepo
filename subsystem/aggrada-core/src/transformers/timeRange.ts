/* eslint-disable no-console */
import { TZDate } from '@date-fns/tz';
import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  parse,
  parseISO,
} from 'date-fns';

const DEFAULT_TIMEZONE = 'UTC';

/**
 * Patterns and parsers for different time range formats
 */
const timeRangePatterns: Array<{
  regex: RegExp;
  parser: (
    match: RegExpMatchArray,
    originTimezone: string
  ) => { originStart: TZDate; originEnd: TZDate };
}> = [
  // ISO 8601 Timestamp (e.g., "2023-01-04T03:00:00.000Z")
  {
    regex: /^\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s*$/,
    parser: ([, isoString], originTimezone) => {
      const parsedDate = parseISO(isoString);
      const tzDate = new TZDate(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        parsedDate.getHours(),
        parsedDate.getMinutes(),
        parsedDate.getSeconds(),
        parsedDate.getMilliseconds(),
        originTimezone
      );

      return {
        originStart: tzDate,
        originEnd: tzDate,
      };
    },
  },
  // Year-Based Inputs (e.g., "2023")
  {
    regex: /^\s*(\d{4})\s*\.?$/,
    parser: ([, year], originTimezone) => {
      const originStart = new TZDate(+year, 0, 1, originTimezone);

      return {
        originStart,
        originEnd: endOfYear(originStart),
      };
    },
  },
  // Month-Year Inputs (e.g., "2023-04", "04-2023", "April 2023")
  {
    regex: /^\s*(\d{4})[-/. ](\d{2})\s*$/,
    parser: ([, year, month], originTimezone) => {
      const originStart = new TZDate(+year, +month - 1, 1, originTimezone);
      return {
        originStart,
        originEnd: endOfMonth(originStart),
      };
    },
  },
  // Identifier for the format "YYYYMM" (example: "202401")
  {
    regex: /^\s*(\d{4})(\d{2})\s*$/,
    parser: ([, year, month], originTimezone) => {
      const originStart = new TZDate(+year, +month - 1, 1, originTimezone);
      return {
        originStart,
        originEnd: endOfMonth(originStart),
      };
    },
  },
  // Quarter-Based Inputs (e.g., "Q1 2023")
  {
    regex: /^(?:Quarter\s+)?Q([1-4])[-/. ]?(\d{4})$/i,
    parser: ([, quarter, year], originTimezone) => {
      const parsedQuarter = parseInt(quarter, 10);
      const month = (parsedQuarter - 1) * 3;
      const originStart = new TZDate(+year, month, 1, originTimezone);
      return {
        originStart,
        originEnd: endOfQuarter(originStart),
      };
    },
  },
  // Semester-Based Inputs (e.g., "S1 2023")
  {
    regex: /^(?:Semester\s+)?S([1-2])[-/. ]?(\d{4})$/i,
    parser: ([, semester, year], originTimezone) => {
      const startMonth = semester === '1' ? 0 : 6;
      const originStart = new TZDate(+year, startMonth, 1, originTimezone);
      return {
        originStart,
        originEnd: endOfMonth(addMonths(originStart, 5)),
      };
    },
  },
  // Day-Based Inputs (e.g., "2023-04-15", "April 15, 2023")
  {
    regex: /^\s*(\d{4})[-/. ](\d{2})[-/. ](\d{2})\s*$/,
    parser: ([, year, month, day], originTimezone) => {
      const originStart = new TZDate(+year, +month - 1, +day, originTimezone);
      return { originStart, originEnd: endOfDay(originStart) };
    },
  },
  // Entry for the "MM/DD/YY" format
  {
    regex: /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\s*$/, // Formato MM/DD/YY
    parser: ([, month, day, year], originTimezone) => {
      const fullYear = +year < 50 ? +year + 2000 : +year + 1900; // Ajusta para 2000+ para anos < 50 e 1900+ para anos >= 50
      const originStart = new TZDate(
        fullYear,
        +month - 1,
        +day,
        originTimezone
      );
      return {
        originStart,
        originEnd: endOfDay(originStart),
      };
    },
  },
  // Add a regex and parser to handle Excel Serial Date format
  {
    regex: /^\s*(\d{5})\s*$/, // Assuming 5 digits for Excel Serial Date
    parser: ([, excelSerial], originTimezone) => {
      // Excel base date is 1900-01-01
      const excelEpoch = new TZDate(1899, 11, 30, originTimezone); // Adjusting the zero-day (Excel's day 1 = 1900-01-01)
      const originStart = new TZDate(
        excelEpoch.getFullYear(),
        excelEpoch.getMonth(),
        excelEpoch.getDate() + parseInt(excelSerial, 10),
        originTimezone
      );
      return {
        originStart,
        originEnd: endOfDay(originStart),
      };
    },
  },
  {
    regex: /^\s*([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})\s*$/i,
    parser: ([, monthName, day, year], originTimezone) => {
      const parsedDate = parse(
        `${monthName} ${day} ${year}`,
        'MMMM d yyyy',
        new Date()
      );
      const originStart = new TZDate(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        originTimezone
      );
      return { originStart, originEnd: endOfDay(originStart) };
    },
  },
  {
    regex: /^\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\s*$/i,
    parser: ([, day, monthName, year], originTimezone) => {
      const parsedDate = parse(
        `${monthName} ${day} ${year}`,
        'MMMM d yyyy',
        new Date()
      );
      const originStart = new TZDate(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        originTimezone
      );
      return { originStart, originEnd: endOfDay(originStart) };
    },
  },
];

/**
 * Checks if a timezone string is a valid IANA timezone identifier.
 * @param timezone - The timezone string to check.
 * @returns True if valid, false otherwise.
 */
const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Creates a TimeRangeSchema from various input formats.
 * @param date - A string representing a date range (e.g., "2024", "Q1 2024", "April 15, 2023").
 * @param timezone - A valid IANA timezone name (e.g., "America/Sao_Paulo").
 * @returns A TimeRangeSchema object with start and end dates in the original timezone and in UTC.
 * @throws An error if the input format or timezone is invalid.
 */
export const createTimeRange = ({
  date,
  timezone = 'unknown',
}: {
  date: string;
  timezone?: string;
}): {
  rawDate: string; // Ex: "2024", "2024-10", "Q1 2024", etc.
  rawTimezone: string; // IANA timezone
  start: string; // Start date without timezone ISO 8601 string
  end: string; // End date without timezone ISO 8601 string
  startTz: string; // Start date with timezone ISO 8601 string
  endTz: string; // End date with timezone ISO 8601 string
} => {
  const formattedTZ =
    timezone === 'unknown' ? DEFAULT_TIMEZONE : timezone.trim();

  if (!isValidTimezone(formattedTZ)) {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }

  const trimmedInput = date.trim();

  for (const { regex, parser } of timeRangePatterns) {
    const match = trimmedInput.match(regex);
    if (match) {
      const parsedInput = parser(match, formattedTZ);

      return {
        rawDate: date,
        rawTimezone: timezone,
        start: format(parsedInput.originStart, 'yyyy-MM-dd HH:mm:ss'),
        end: format(parsedInput.originEnd, 'yyyy-MM-dd HH:mm:ss'),
        startTz: parsedInput.originStart.toISOString(),
        endTz: parsedInput.originEnd.toISOString(),
      };
    }
  }

  throw new Error(`Invalid input format for TimeRange: ${date}`);
};

/**
 * Checks if the observation time range is within the aggregation range.
 */
export const isWithinTimeRange = ({
  searchRange,
  setRange,
}: {
  searchRange: { start: Date; end: Date };
  setRange: { start: Date; end: Date };
}) => {
  return searchRange.start >= setRange.start && searchRange.end <= setRange.end;
};

import { jenksBuckets } from './jenks';

const categoricalColors = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
  '#aec7e8',
  '#ffbb78',
  '#98df8a',
  '#ff9896',
  '#c5b0d5',
];

const numericalColors = ['#8C8C8C', '#00B89F', '#0093B2', '#0067C5', '#00497A'];

/**
 * Create frequency table with Jenks method from an array of number
 * @param data Array of number to create frequency table
 * @param classQty Number of classes to create frequency table
 */
const getFrequencyTable = async ({
  data,
  classQty = 4,
}: {
  data: number[];
  classQty?: number;
}) => {
  const dataTreat: number[] = data.reduce((acc, cur) => {
    if (!cur || isNaN(+cur) || +cur == 0) {
      return acc;
    }
    return [...acc, +cur];
  }, [] as number[]);

  if (dataTreat.length <= classQty) {
    return Array.from(new Set(dataTreat)).sort((a, b) => {
      return a - b;
    });
  }

  const freqMethod = jenksBuckets(dataTreat, classQty);

  return Array.from(new Set(freqMethod)).sort((a, b) => {
    return a - b;
  });
};

export type Caption = {
  value: number;
  name: string;
  fillColor: string;
  dataType: 'categorical' | 'numerical';
};

export type PolygonOptions = {
  fillColor: string;
  value: number;
  caption: Caption;
};

export type PolygonsOptions = Record<string, PolygonOptions>;

export const getPolygonsOptionsForNumericalValues = async (
  locationsValues: Record<string, number | string>
) => {
  const values = Object.values(locationsValues).map((value) => {
    return Number(value);
  });

  const frequencyTable = await getFrequencyTable({
    data: values,
  });

  const captions = (() => {
    if (frequencyTable.length === 1) {
      return [
        {
          value: frequencyTable[0],
          name: frequencyTable[0].toString(),
          fillColor: numericalColors[0],
          dataType: 'numerical' as const,
        },
      ];
    }

    return frequencyTable.map((bucket, index) => {
      const name = (() => {
        if (index === 0) {
          return `${bucket}`;
        }

        const initValue = frequencyTable[index - 1] + 1;

        if (initValue === bucket) {
          return `${bucket}`;
        }

        return `de ${initValue} até ${bucket}`;
      })();

      return {
        value: bucket,
        name,
        fillColor: numericalColors[index],
        dataType: 'numerical' as const,
      };
    });
  })();

  const polygonsOptions = Object.entries(locationsValues).reduce(
    (acc, [key, value]) => {
      const valueAsNumber = Number(value);

      const caption = captions.find((c) => {
        return c.value === valueAsNumber;
      }) || {
        fillColor: 'transparent',
        value: 0,
        name: '',
        dataType: 'numerical' as const,
      };

      acc[key] = {
        fillColor: caption.fillColor || 'transparent',
        value: valueAsNumber,
        caption,
      };

      return acc;
    },
    {} as PolygonsOptions
  );

  return { captions, polygonsOptions };
};

export const getPolygonsOptionsForCategoricalValues = async ({
  values,
  dictionary,
  variable,
}: {
  values: Record<string, string | number>;
  dictionary: Record<string, Record<string, string>>;
  variable: string;
}) => {
  const uniqueValues = Array.from(new Set(Object.values(values)))
    .sort()
    .filter(Boolean)
    .map(Number);

  const captions = uniqueValues.map((value, index) => {
    const noDecimalValue = String(Number(value));
    return {
      value,
      name: dictionary[variable][noDecimalValue] || 'Não informado',
      fillColor: categoricalColors[index],
      dataType: 'categorical' as const,
    };
  });

  const polygonsOptions = Object.entries(values).reduce(
    (acc, [key, value]) => {
      const noDecimalValue = Number(value);

      const caption = captions.find((caption) => {
        return caption.value === noDecimalValue;
      }) || {
        value: noDecimalValue,
        name: 'Não informado',
        fillColor: 'transparent',
        dataType: 'categorical',
      };

      acc[key] = {
        fillColor: caption?.fillColor || 'transparent',
        value: noDecimalValue,
        caption,
      };

      return acc;
    },
    {} as Record<string, PolygonOptions>
  );

  return { captions, polygonsOptions };
};

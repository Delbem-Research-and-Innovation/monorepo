import { jenksBuckets } from './jenks';

// const categoricalColors = [
//   '#1f77b4',
//   '#ff7f0e',
//   '#2ca02c',
//   '#d62728',
//   '#9467bd',
//   '#8c564b',
//   '#e377c2',
//   '#7f7f7f',
//   '#bcbd22',
//   '#17becf',
//   '#aec7e8',
//   '#ffbb78',
//   '#98df8a',
//   '#ff9896',
//   '#c5b0d5',
// ];

// Function to interpolate between two hex colors
const interpolateColor = (
  color1: string,
  color2: string,
  factor: number
): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Generate gradient colors
// const baseColors = ['#00D4AA', '#00B89F', '#0093B2', '#0067C5', '#00497A'];

const getCategoricalColors = (n: number) => {
  const initialColor = '#66FFE6';
  const finalColor = '#002040';

  const gradientColors = [initialColor];

  if (n <= 1) {
    return gradientColors;
  }

  for (let i = 1; i < n; i++) {
    const factor = (i + 1) / n;
    const interpolatedColor = interpolateColor(
      initialColor,
      finalColor,
      factor
    );
    gradientColors.push(interpolatedColor);
  }

  return gradientColors;
};

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
    if (cur === null || isNaN(+cur)) {
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

      const caption = captions.find((c, index) => {
        const nextCaption = captions[index + 1];
        return (
          valueAsNumber >= c.value &&
          (!nextCaption || valueAsNumber < nextCaption.value)
        );
      }) || {
        fillColor: 'transparent',
        value: 0,
        name: '',
        dataType: 'numerical' as const,
      };

      acc[key] = {
        fillColor: caption.fillColor,
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
  dictionary: Record<
    string,
    {
      variable: string;
      description: string;
      captions: Record<string, string>;
    }
  >;
  variable: string;
}) => {
  const variableDict = dictionary[variable];

  const categoricalColors = getCategoricalColors(
    Object.entries(variableDict.captions).length
  );

  const getNoDecimal = (value: string | number) => {
    return Number(value);
  };

  const captions = Object.entries(variableDict.captions).map(
    ([key, caption], index) => {
      const noDecimalValue = getNoDecimal(key);
      return {
        value: noDecimalValue,
        name: caption || 'Não informado',
        fillColor: categoricalColors[index],
        dataType: 'categorical' as const,
      };
    }
  );

  const polygonsOptions = Object.entries(values).reduce(
    (acc, [key, value]) => {
      const noDecimalValue = getNoDecimal(value);

      const caption = captions.find((caption) => {
        return caption.value === noDecimalValue;
      }) || {
        value: noDecimalValue,
        name: 'Não informado',
        fillColor: 'transparent',
        dataType: 'categorical',
      };

      acc[key] = {
        fillColor: caption.fillColor,
        value: noDecimalValue,
        caption,
      };

      return acc;
    },
    {} as Record<string, PolygonOptions>
  );

  return { captions, polygonsOptions };
};

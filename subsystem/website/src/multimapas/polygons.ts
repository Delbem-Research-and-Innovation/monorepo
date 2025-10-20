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

const baseColors = [
  '#66FFE6',
  '#00D4AA',
  '#00B89F',
  '#0093B2',
  '#0067C5',
  '#00497A',
  '#004080',
  '#002040',
];

const categoricalColors = (() => {
  let gradientColors = [];

  for (let i = 0; i < baseColors.length; i++) {
    gradientColors.push(baseColors[i]);

    if (i < baseColors.length - 1) {
      const maxInterpolations = 10;
      for (let j = 1; j <= maxInterpolations; j++) {
        const factor = j / (maxInterpolations + 1);
        const interpolatedColor = interpolateColor(
          baseColors[i],
          baseColors[i + 1],
          factor
        );
        gradientColors.push(interpolatedColor);
      }
    }
  }

  gradientColors = gradientColors.sort().reverse();

  // /**
  //  * Sort in a such way that colors with similar tones stay apart
  //  * from each other in the array. This helps to avoid having
  //  * similar colors next to each other when assigning colors
  //  * to categorical values.
  //  */
  // return [
  //   gradientColors[0],
  //   gradientColors[32],
  //   // First half
  //   gradientColors[16],
  //   // Second half
  //   gradientColors[8],
  //   gradientColors[24],
  //   // Third half
  //   gradientColors[4],
  //   gradientColors[12],
  //   gradientColors[20],
  //   gradientColors[28],
  //   // Fourth half
  //   gradientColors[2],
  //   gradientColors[6],
  //   gradientColors[10],
  //   gradientColors[14],
  //   gradientColors[18],
  //   gradientColors[22],
  //   gradientColors[26],
  //   gradientColors[30],
  //   // Fifth half
  //   gradientColors[1],
  //   gradientColors[3],
  //   gradientColors[5],
  //   gradientColors[7],
  //   gradientColors[9],
  //   gradientColors[11],
  //   gradientColors[13],
  //   gradientColors[15],
  //   gradientColors[17],
  //   gradientColors[19],
  //   gradientColors[21],
  //   gradientColors[23],
  //   gradientColors[25],
  //   gradientColors[27],
  //   gradientColors[29],
  //   gradientColors[31],
  // ];

  return gradientColors;
})();

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
  const uniqueValues = Array.from(new Set(Object.values(values)))
    .sort()
    .filter((value) => {
      return value !== null && value !== undefined;
    })
    .map(Number);

  const captions = uniqueValues.map((value, index) => {
    const noDecimalValue = String(Number(value));
    return {
      value,
      name: dictionary[variable].captions[noDecimalValue] || 'Não informado',
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

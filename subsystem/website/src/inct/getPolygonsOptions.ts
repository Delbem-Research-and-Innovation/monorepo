import { getIncomeValuesByType } from './getIncomeValuesByType';
import { jenksBuckets } from './jenks';
import { variablesDictionary } from './variablesDictionary';

const colors = [
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

const numericColors = ['#CACACA', '#6ACDB7', '#41B6C4', '#5297D0', '#007BA2'];

export type PolygonsOptions = Record<
  string,
  {
    options: Record<
      string,
      { id: string; fillColor: string; value: string | number }
    >;
    captions: Record<string, { name: string; fillColor: string }>;
  }
>;

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
    return [
      0,
      ...dataTreat.sort((a, b) => {
        return a - b;
      }),
    ];
  }

  const freqMethod = await jenksBuckets(dataTreat, classQty);
  freqMethod.splice(0, 1);
  return Array.from(new Set([0, ...freqMethod])).sort((a, b) => {
    return a - b;
  });
};

export const getPolygonsOptions = async ({
  incomeType,
}: {
  incomeType: string;
}): Promise<PolygonsOptions> => {
  const allVariablesValues = await getIncomeValuesByType({
    incomeType,
  });

  const variables = Object.keys(allVariablesValues);

  const allVariablesPolygonsValues = await Promise.all(
    variables.map(async (variable) => {
      const values = allVariablesValues[variable];

      /**
       * Numeric variables
       */
      if (variablesDictionary[variable].type === 'numeric') {
        const valuesAsNumber = Object.values(values).map(Number);

        const frequencyTable = await getFrequencyTable({
          data: valuesAsNumber,
        });

        const captions = (() => {
          if (frequencyTable.length === 1) {
            return {
              [frequencyTable[0]]: {
                value: frequencyTable[0],
                name: frequencyTable[0].toString(),
                fillColor: numericColors[0],
              },
            };
          }

          return Object.fromEntries(
            frequencyTable.map((bucket, index) => {
              const name = (() => {
                if (index === 0) {
                  return `0`;
                }

                const initValue = frequencyTable[index - 1] + 1;

                return `de ${initValue} até ${bucket}`;
              })();

              return [
                bucket,
                {
                  value: bucket,
                  name,
                  fillColor: numericColors[index],
                },
              ];
            })
          );
        })();

        const options = Object.entries(values).reduce((acc, [key, value]) => {
          const valueAsNumber = Number(value);
          const bucket = Object.values(captions).reduce(
            (currentBucket, caption) => {
              if (valueAsNumber >= caption.value) {
                return caption;
              }
              return currentBucket;
            },
            Object.values(captions)[0]
          );

          acc[key] = {
            id: key,
            fillColor: bucket.fillColor,
            value: valueAsNumber,
          };

          return acc;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, {} as any);

        return [variable, { options, captions }];
      }

      /**
       * Categoric variables
       */
      const uniqueValues = Array.from(new Set(Object.values(values)))
        .sort()
        .filter(Boolean);

      const captions = Object.fromEntries(
        uniqueValues.map((value, index) => {
          const noDecimalValue = value.split('.')[0];
          return [
            value,
            {
              name:
                variablesDictionary[variable].options[noDecimalValue] || null,
              fillColor: colors[index],
            },
          ];
        })
      );

      const options = Object.entries(values).reduce((acc, [key, value]) => {
        const noDecimalValue = Number(value.split('.')[0]);

        acc[key] = {
          id: key,
          fillColor: captions[value]?.fillColor || 'transparent',
          value: noDecimalValue,
        };

        return acc;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, {} as any);

      return [variable, { options, captions }];
    })
  );

  return Object.fromEntries(allVariablesPolygonsValues);
};

/**
 * Used for /inct-combate-a-fome-sp/multimapas/fronteira-de-pareto.tsx
 * @param valuesObj: Record<string, number>
 * valuesObj is an object with the values of the variable with its respective key
 */
export const getPolygonsOptionsForNumericValues = async (
  valuesObj: Record<string, number>
) => {
  const values = Object.values(valuesObj);

  const frequencyTable = await getFrequencyTable({
    data: values,
  });

  const captions = (() => {
    if (frequencyTable.length === 1) {
      return [
        {
          value: frequencyTable[0],
          name: frequencyTable[0].toString(),
          fillColor: numericColors[0],
        },
      ];
    }

    return frequencyTable.map((bucket, index) => {
      const name = (() => {
        if (index === 0) {
          return `0`;
        }

        const initValue = frequencyTable[index - 1] + 1;

        return `de ${initValue} até ${bucket}`;
      })();

      return {
        value: bucket,
        name,
        fillColor: numericColors[index],
      };
    });
  })();

  type Caption = (typeof captions)[number];

  const options = Object.entries(valuesObj).reduce(
    (acc, [key, value]) => {
      const valueAsNumber = Number(value);
      const caption = captions.reduce((currentCaption, caption) => {
        if (
          valueAsNumber > currentCaption.value &&
          valueAsNumber <= caption.value
        ) {
          return caption;
        }
        return currentCaption;
      }, captions[0]);

      acc[key] = {
        fillColor: caption.fillColor || 'transparent',
        value: valueAsNumber,
        caption,
      };

      return acc;
    },
    {} as Record<string, { fillColor: string; value: number; caption: Caption }>
  );

  return { captions, options };
};

export const getPolygonsOptionsForCategoricValues = async (
  valuesObj: Record<string, number>,
  variable: string
) => {
  const uniqueValues = Array.from(new Set(Object.values(valuesObj)))
    .sort()
    .filter(Boolean)
    .map(Number);

  const captions = uniqueValues.map((value, index) => {
    const noDecimalValue = Number(value);
    return {
      value,
      name: variablesDictionary[variable].options[noDecimalValue] || null,
      fillColor: colors[index],
    };
  });

  type Caption = (typeof captions)[number];

  const options = Object.entries(valuesObj).reduce(
    (acc, [key, value]) => {
      const noDecimalValue = Number(value);

      const caption = captions.find((caption) => {
        return caption.value === noDecimalValue;
      }) || {
        value: noDecimalValue,
        name: null,
        fillColor: 'transparent',
      };

      acc[key] = {
        fillColor: caption?.fillColor || 'transparent',
        value: caption.name,
        caption,
      };

      return acc;
    },
    {} as Record<string, { fillColor: string; value: number; caption: Caption }>
  );

  return { captions, options };
};

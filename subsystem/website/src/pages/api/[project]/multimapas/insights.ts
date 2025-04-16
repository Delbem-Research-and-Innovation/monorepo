import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { getProjectByName } from 'src/multimapas/projects';

const client = new OpenAI({});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const project = await getProjectByName(req.query.project as string);

  if (!project?.ai?.instructions || !project?.ai?.input) {
    return res
      .status(400)
      .json({ error: 'Project does not have AI instructions or input.' });
  }

  const region = project.regions.find((region) => {
    return region.name === req.query.region;
  });

  if (!region) {
    return res.status(400).json({ error: 'Region not found.' });
  }

  // Construct a well-structured prompt with clear sections
  const instructionsArr = [`# Instruções\n${project.ai.instructions}`];

  instructionsArr.push(
    `\n## Contexto da Regionalização\nTipo de regionalização: ${region.name}`
  );

  instructionsArr.push(
    '\n## Localizações no Projeto\nSegue a lista das localizações com seus respectivos códigos:'
  );

  const locationsList = region.locations
    .map((loc) => {
      return `- ${loc.code}: ${loc.name}`;
    })
    .join('\n');
  instructionsArr.push(locationsList);

  if (project.dictionary) {
    instructionsArr.push('\n## Dicionário de Variáveis');
    instructionsArr.push(
      'Segue a lista das variáveis com suas respectivas descrições e categorias:'
    );
    for (const variable of region.variables) {
      const variableInfo = project.dictionary[variable.name];
      const variableName = variableInfo.variable || variable.name;

      if (variableInfo) {
        // Use the variable name directly if the 'variable' property doesn't exist
        instructionsArr.push(`\n### ${variableName}`);
        instructionsArr.push(`\n#### Descrição:`);
        instructionsArr.push(variableInfo.description || 'Não disponível');
        if (
          variableInfo.captions &&
          Object.keys(variableInfo.captions).length > 0
        ) {
          instructionsArr.push(`\n#### Categorias:`);
          for (const [captionKey, captionValue] of Object.entries(
            variableInfo.captions
          )) {
            instructionsArr.push(`  - ${captionKey}: ${captionValue}`);
          }
        }
      } else {
        instructionsArr.push(`\n### ${variableName}`);
        instructionsArr.push(`\n#### Descrição:`);
        instructionsArr.push('É uma variável numérica e não categórica');
      }
    }
  }

  instructionsArr.push(
    '\n## Dados das Variáveis por Localização\nSegue os valores associados a cada localização:'
  );

  // Create a structured data object for easy reference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredData: Record<string, Record<string, any>> = {};

  for (const variable of region.variables) {
    instructionsArr.push(`\n### Variável: ${variable.name}`);

    // Add structured data for validation
    structuredData[variable.name] = {};

    const dataEntries = Object.entries(variable.data)
      .map(([key, value]) => {
        // Store in structured format for later verification
        structuredData[variable.name][key] = value;
        return `- ${key}: ${value}`;
      })
      .join('\n');
    instructionsArr.push(dataEntries);
  }

  // Add specific instructions for insight generation with data validation emphasis
  instructionsArr.push('\n## Instruções gerais para a geração de Insights');
  instructionsArr.push(
    '1. Analise os padrões nos dados fornecidos com extrema precisão'
  );
  instructionsArr.push('2. Identifique correlações ou anomalias interessantes');
  instructionsArr.push(
    '3. Quando mencionar valores específicos como 0 ou 1, VERIFIQUE NOVAMENTE todas as ocorrências desses valores'
  );
  instructionsArr.push(
    '4. Para valores categóricos ou binários, liste TODAS as localizações que compartilham o mesmo valor'
  );
  instructionsArr.push(
    '5. Escolha uma localização específica que mereça destaque com base na análise'
  );
  instructionsArr.push(
    '6. Se afirmar que uma localização é a "única" com certo valor, confirme que isso é verdadeiro'
  );
  instructionsArr.push('7. Formule um insight claro, conciso e informativo');
  instructionsArr.push(
    '8. O insight deve ser baseado nos dados e útil para tomada de decisões'
  );
  instructionsArr.push('9. Use linguagem acessível e direta');
  instructionsArr.push(
    '10. NÃO cometa erros factuais sobre a distribuição dos dados'
  );
  instructionsArr.push(
    '11. SEMPRE use o nome da localização em vez do código quando mencionar uma localização'
  );

  instructionsArr.push(
    '\n## Formato de Resposta\nA resposta deve ser um JSON com as seguintes chaves:\n- insight: O insight gerado pela IA\n- locationCode: O código da localização que foi destacada no insight\n- factCheck: Uma verificação adicional afirmando que você verificou todos os dados mencionados no insight'
  );

  const instructions = instructionsArr.join('\n');

  const input = project.ai.input;

  const aiResponse = await client.responses.create({
    model: project.ai?.model || 'gpt-4o-mini',
    temperature: project?.ai?.temperature || 0.7,
    instructions,
    input,
    text: {
      format: {
        type: 'json_schema',
        name: 'insight_schema',
        schema: {
          additionalProperties: false,
          required: ['insight', 'locationCode', 'factCheck'],
          type: 'object',
          properties: {
            insight: {
              type: 'string',
              description: 'Insight generated by the AI',
            },
            locationCode: {
              type: 'string',
              description: 'Location code to be highlighted in the map',
            },
            factCheck: {
              type: 'string',
              description:
                'Confirmation that all data facts were double-checked',
            },
          },
        },
      },
    },
  });

  try {
    const responseData = JSON.parse(aiResponse.output_text);

    // Validate response before sending it - check if there's a factual claim about uniqueness
    if (
      responseData.insight.toLowerCase().includes('única') ||
      responseData.insight.toLowerCase().includes('unico') ||
      responseData.insight.toLowerCase().includes('apenas')
    ) {
      // Extract claims about variables from the insight
      const variableMatch = responseData.insight.match(
        /variável ['']([^'']+)['']/i
      );
      if (variableMatch && variableMatch[1]) {
        const variableName = variableMatch[1];
        const valueMatch = responseData.insight.match(/valor (?:de )?(\d+)/i);

        if (valueMatch && variableName && structuredData[variableName]) {
          const claimedValue = valueMatch[1];

          // Count how many locations actually have this value
          const locationsWithValue = Object.entries(
            structuredData[variableName]
          )
            .filter(([, value]) => {
              return String(value) === claimedValue;
            })
            .map(([code]) => {
              return code;
            });

          // If there's a factual error about uniqueness
          if (
            locationsWithValue.length > 1 &&
            (responseData.insight.toLowerCase().includes('única') ||
              responseData.insight.toLowerCase().includes('unico') ||
              responseData.insight.toLowerCase().includes('apenas'))
          ) {
            // Try one more time with more explicit instructions
            instructionsArr.push('\n## CORREÇÃO DE ERRO FACTUAL IMPORTANTE');
            instructionsArr.push(
              `Você indicou que a localização ${responseData.locationCode} é a única com valor ${claimedValue} para a variável "${variableName}", mas isso é INCORRETO.`
            );
            instructionsArr.push(
              `As seguintes localizações têm o valor ${claimedValue} para esta variável: ${locationsWithValue.join(', ')}`
            );
            instructionsArr.push(
              'Por favor, reformule seu insight considerando TODAS estas localizações e selecione uma delas com base em outros critérios relevantes.'
            );

            const correctedResponse = await client.responses.create({
              model: 'gpt-4o-mini',
              temperature: 0.5, // Lower temperature for more accuracy
              instructions: instructionsArr.join('\n'),
              input,
              text: {
                format: {
                  type: 'json_schema',
                  name: 'insight_schema',
                  schema: {
                    additionalProperties: false,
                    required: ['insight', 'locationCode', 'factCheck'],
                    type: 'object',
                    properties: {
                      insight: {
                        type: 'string',
                        description: 'Corrected insight generated by the AI',
                      },
                      locationCode: {
                        type: 'string',
                        description:
                          'Location code to be highlighted in the map',
                      },
                      factCheck: {
                        type: 'string',
                        description:
                          'Confirmation that all data facts were double-checked',
                      },
                    },
                  },
                },
              },
            });

            const response = {
              ...JSON.parse(correctedResponse.output_text),
              instructions,
              input,
            };

            return res.status(200).json(response);
          }
        }
      }
    }

    const response = {
      ...responseData,
      instructions,
      input,
    };

    return res.status(200).json(response);
  } catch {
    return res.status(500).json({
      error: 'Failed to process AI response',
      aiResponse: aiResponse.output_text,
    });
  }
};

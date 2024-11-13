import { AggregatedDataEntry } from './getAggregation'; // Substitua pelo caminho correto do tipo AggregatedDataEntry

/**
 * Transforma uma coleção de dados em um AsyncIterable.
 *
 * @param data - Array de AggregatedDataEntry a serem processados.
 * @returns Um AsyncIterable que pode ser usado para processamento em streaming.
 */
export async function* asyncIterableFromArray(
  data: AggregatedDataEntry[]
): AsyncIterable<AggregatedDataEntry> {
  for (const item of data) {
    yield item;
  }
}

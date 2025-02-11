/**
 * https://docs.google.com/spreadsheets/d/14vbcri3-g-Orq2MBA-UkKpTI_PeKi9kJ/edit?gid=1015788058#gid=1015788058
 */
export const variablesDictionary = {
  cod_sexo_pessoa: {
    description: 'Sexo',
    options: {
      1: 'Masculino',
      2: 'Feminino',
    },
  },
  idade: {
    description:
      'Idade calculada a partir da diferença entre a data de nascimento da pessoa e a data de referência da base',
    type: 'numeric',
  },
  cod_parentesco_rf_pessoa: {
    description: 'Relaçao de parentesco com o RF',
    options: {
      1: 'Pessoa Responsável pela Unidade Familiar - RF',
      2: 'Cônjuge ou companheiro(a)',
      3: 'Filho(a)',
      4: 'Enteado(a)',
      5: 'Neto(a) ou bisneto(a)',
      6: 'Pai ou mãe',
      7: 'Sogro(a)',
      8: 'Irmão ou irmã',
      9: 'Genro ou nora',
      10: 'Outro parente',
      11: 'Não parente',
    },
  },
  cod_raca_cor_pessoa: {
    description: 'Cor ou raça',
    options: {
      1: 'Branca',
      2: 'Preta',
      3: 'Amarela',
      4: 'Parda',
      5: 'Indígena',
    },
  },
  cod_local_nascimento_pessoa: {
    description: 'Local de nascimento',
    options: {
      1: 'Neste município',
      2: 'Em outro município',
      3: 'Em outro país',
    },
  },
  cod_certidao_registrada_pessoa: {
    description: 'Pessoa registrada em cartório',
    options: {
      1: 'Sim e tem Certidão de Nascimento',
      2: 'Sim, mas não tem Certidão de Nascimento',
      3: 'Não',
      4: 'Não sabe',
    },
  },
  cod_deficiencia_memb: {
    description: 'Pessoa tem deficiência?',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  cod_sabe_ler_escrever_memb: {
    description: 'Pessoa sabe ler e escrever?',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  ind_frequenta_escola_memb: {
    description: 'Pessoa frequenta escola?',
    options: {
      1: 'Sim, rede pública',
      2: 'Sim, rede particular',
      3: 'Não, já frequentou',
      4: 'Nunca frequentou',
    },
  },
  cod_escola_local_memb: {
    description: 'Escola localizada no município?',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  cod_curso_frequenta_memb: {
    description: 'Curso que a pessoa frequenta',
    options: {
      1: 'Creche',
      2: 'Pré-escola (exceto CA)',
      3: 'Classe de Alfabetização - CA',
      4: 'Ensino Fundamental regular (duração 8 anos)',
      5: 'Ensino Fundamental regular (duração 9 anos)',
      6: 'Ensino Fundamental especial',
      7: 'Ensino Médio regular',
      8: 'Ensino Médio especial',
      9: 'Ensino Fundamental EJA - séries iniciais (Supletivo - 1ª a 4ª)',
      10: 'Ensino Fundamental EJA - séries finais (Supletivo - 5ª a 8ª)',
      11: 'Ensino Médio EJA (Supletivo)',
      12: 'Alfabetização para adultos (Mobral, etc.)',
      13: 'Superior, Aperfeiçoamento, Especialização, Mestrado, Doutorado',
      14: 'Pré-vestibular',
    },
  },
  cod_ano_serie_frequenta_memb: {
    description: 'Ano e série que a pessoa frequenta',
    options: {
      1: 'Primeiro(a)',
      2: 'Segundo(a)',
      3: 'Terceiro(a)',
      4: 'Quarto(a)',
      5: 'Quinto(a)',
      6: 'Sexto(a)',
      7: 'Sétimo(a)',
      8: 'Oitavo(a)',
      9: 'Nono(a)',
      10: 'Curso não-seriado',
    },
  },
  cod_curso_frequentou_pessoa_memb: {
    description: 'Curso mais elevado que a pessoa frequentou',
    options: {
      1: 'Creche',
      2: 'Pré-escola (exceto CA)',
      3: 'Classe de Alfabetização - CA',
      4: 'Ensino Fundamental regular (duração 8 anos)',
      5: 'Ensino Fundamental regular (duração 9 anos)',
      6: 'Ensino Fundamental especial',
      7: 'Ensino Médio regular',
      8: 'Ensino Médio especial',
      9: 'Ensino Fundamental EJA - séries iniciais (Supletivo - 1ª a 4ª)',
      10: 'Ensino Fundamental EJA - séries finais (Supletivo - 5ª a 8ª)',
      11: 'Ensino Médio EJA (Supletivo)',
      12: 'Alfabetização para adultos (Mobral, etc.)',
      13: 'Superior, Aperfeiçoamento, Especialização, Mestrado, Doutorado',
      14: 'Alfabetização para adultos (Mobral, etc.)',
      15: 'Nenhum',
    },
  },
  cod_ano_serie_frequentou_memb: {
    description: 'Último ano e série frequentado pela pessoa',
    options: {
      1: 'Primeiro(a)',
      2: 'Segundo(a)',
      3: 'Terceiro(a)',
      4: 'Quarto(a)',
      5: 'Quinto(a)',
      6: 'Sexto(a)',
      7: 'Sétimo(a)',
      8: 'Oitavo(a)',
      9: 'Nono(a)',
      10: 'Curso não-seriado',
      11: 'Nenhum',
    },
  },
  cod_concluiu_frequentou_memb: {
    description: 'A pessoa concluiu o curso?',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  cod_trabalhou_memb: {
    description: 'Pessoa trabalhou na semana passada?',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  cod_afastado_trab_memb: {
    description: 'Pessoa afastada na semana passada?',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  cod_agricultura_trab_memb: {
    description: 'É atividade extrativista?',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  cod_principal_trab_memb: {
    description: 'Função principal',
    options: {
      1: 'Trabalhador por conta própria (bico, autônomo)',
      2: 'Trabalhador temporário em área rural',
      3: 'Empregado sem carteira de trabalho assinada',
      4: 'Empregado com carteira de trabalho assinada',
      5: 'Trabalhador doméstico sem carteira de trabalho assinada',
      6: 'Trabalhador doméstico com carteira de trabalho assinada',
      7: 'Trabalhador não-remunerado',
      8: 'Militar ou servidor público',
      9: 'Empregador',
      10: 'Estagiário',
      11: 'Aprendiz',
    },
  },
  val_remuner_emprego_memb: {
    description:
      'val_remuner_emprego_memb NNNNN (sem casas decimais). Ex. Uma remuneração de R$ 125,00 constará na base como 125.',
    type: 'numeric',
  },
  cod_trabalho_12_meses_memb: {
    description:
      'Pessoa com trabalho remunerado em algum período nos último 12 meses',
    options: {
      1: 'Sim',
      2: 'Não',
    },
  },
  qtd_meses_12_meses_memb: {
    description: 'Quantidade de meses trabalhados nos últimos 12 meses',
    type: 'numeric',
  },
  val_renda_bruta_12_meses_memb: {
    description:
      'Valor de remuneração bruta no formato NNNNN (sem casas decimais). Ex. Uma remuneração de R$ 125,00 constará na base como 125.',
    type: 'numeric',
  },
  val_renda_doacao_membr: {
    description:
      'Valor recebido de doação no formato NNNNN (sem casas decimais). Ex. Uma renda de R$ 125,00 constará na base como 125.',
    type: 'numeric',
  },
  val_renda_aposent_memb: {
    description:
      'Valor recebido de aposentadoria no formato NNNNN (sem casas decimais). Ex. Uma remuneração de R$ 125,00 constará na base como 125.',
    type: 'numeric',
  },
  val_renda_seguro_desemp_memb: {
    description:
      'Valor recebido de seguro desemprego no formato NNNNN (sem casas decimais). Ex. Um valor de R$ 125,00 constará na base como 125.',
    type: 'numeric',
  },
  val_renda_pensao_alimen_memb: {
    description:
      'Valor recebido de pensão alimentícia no formato NNNNN (sem casas decimais). Ex. Uma renda de R$ 125,00 constará na base como 125.',
    type: 'numeric',
  },
  'peso.fam': {
    description: 'Peso calculado da família',
    type: 'numeric',
  },
  'peso.pes': {
    description: 'Peso calculado da pessoa',
    type: 'numeric',
  },
  val_outras_rendas_memb: {
    description:
      'Valor recebido de outras fontes no formato NNNNN (sem casas decimais). Ex. Uma renda de R$ 125,00 constará na base como 125.',
    type: 'numeric',
  },
  estrato: {
    description:
      'São gandes grupos de municípios, de acordo com a quantidade de famílias cadastradas',
    options: {
      1: 'GM1 (101 A 5.000 famílias)',
      2: 'GM1 (5.001 ou mais famílias)',
    },
  },
  classf: {
    description: 'Subdivisão pela Unidade Federativa e divisão administrativa',
    options: {
      1: 'Capital',
      2: 'Região Metropolitana (RM) ou Região Integrada de Desenvolvimento (RIDE)',
      3: 'Outros',
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

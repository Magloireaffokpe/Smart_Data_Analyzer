// src/types/api.ts

// ============================================================
// MODES & VIEWS
// ============================================================
export type AnalysisMode = 'summary' | 'full';
export type AppView = 'home' | 'loading' | 'results';

// ============================================================
// DATASET INFO (partagé entre full et summary)
// ============================================================
export interface DatasetInfo {
  rows: number;
  columns: number;
  column_list: Array<{ name: string; dtype: string }>;
  completeness_pct: number;
  quality_label: 'excellent' | 'good' | 'moderate' | 'poor';
  duplicate_rows: number;
  missing_cells: number;
}

// ============================================================
// STATISTICS (mode full)
// ============================================================
export interface NumericStats {
  count: number;
  mean: number;
  std: number;
  min: number;
  '25%': number;
  '50%': number;
  '75%': number;
  max: number;
}

export interface DatetimeStats {
  count: number;
  min: string | null;
  max: string | null;
  range_days: number | null;
}

export interface TextStats {
  count: number;
  unique: number;
  top: string | null;
  freq: number;
}

export type ColumnStats = NumericStats | DatetimeStats | TextStats;
export type StatisticsData = Record<string, ColumnStats>;

// ============================================================
// CORRELATIONS (mode full)
// ============================================================
export interface CorrelationPair {
  col_a: string;
  col_b: string;
  correlation: number;
  p_value: number;
  significant: boolean;
  strength: string;
  direction: 'positive' | 'negative';
  interpretation: string;
}

export interface MatrixResult {
  method?: string;
  description?: string;
  n_rows_used?: number;
  matrix?: Record<string, Record<string, number | null>>;
  top_pairs?: CorrelationPair[];
  available?: boolean;
  reason?: string;
}

export interface Chi2Pair {
  column_a: string;
  column_b: string;
  chi2_statistic: number;
  p_value: number;
  degrees_of_freedom: number;
  cramers_v: number;
  association_strength: string;
  significant: boolean;
  interpretation: string;
}

export interface Chi2Result {
  method: string;
  description: string;
  columns_tested: string[];
  n_pairs_tested: number;
  n_significant: number;
  pairs: Chi2Pair[];
  available?: boolean;
  reason?: string;
}

export interface CorrelationsResult {
  pearson: MatrixResult;
  spearman: MatrixResult;
  chi2: Chi2Result;
  summary: {
    n_influential_pairs: number;
    influential_pairs: Array<{
      method: string;
      col_a?: string;
      col_b?: string;
      correlation?: number;
      cramers_v?: number;
      strength: string;
      direction?: string;
      note?: string;
    }>;
    redundant_columns: string[];
    hub_columns: Array<{ column: string; n_connections: number }>;
    numeric_columns_analyzed: string[];
    categorical_columns_analyzed: string[];
  };
}

// ============================================================
// KEY VARIABLES (mode summary)
// ============================================================
export interface KeyVariable {
  name: string;
  correlation: number;
  direction: 'positive' | 'negative';
  strength: string;
  p_value: number;
  significant: boolean;
  importance_score: number;
}

// ============================================================
// AI RESPONSES (mode full)
// ============================================================
export interface ColumnInsight {
  column: string;
  type: 'numeric' | 'text' | 'date' | 'boolean';
  insight: string;
}

export interface CausalFactor {
  target_variable: string;
  why_target: string;
  influencing_factors: Array<{
    factor: string;
    method: 'Pearson' | 'Spearman' | 'Chi²';
    correlation_value?: number;
    influence_strength: 'strong' | 'moderate' | 'weak';
    explanation: string;
  }>;
}

export interface CausalExplanation {
  col_a: string;
  col_b: string;
  relationship_type: 'linear' | 'non-linear' | 'categorical';
  probable_direction: string;
  explanation: string;
  business_implication: string;
}

export interface CorrelationAnalysisAI {
  pearson_highlights?: string;
  spearman_highlights?: string;
  chi2_highlights?: string;
  redundant_columns?: string;
  hub_columns?: string;
}

export interface FullAIResponse {
  overview: string | null;
  data_quality: string | null;
  column_insights: ColumnInsight[];
  correlation_analysis: CorrelationAnalysisAI;
  causal_factors: CausalFactor[];
  causal_explanations: CausalExplanation[];
  anomalies: string | null;
  recommendations: string[];
  mode: 'full';
  model_used: string;
  raw_interpretation?: string;      // fallback
  warning?: string;
}

// ============================================================
// AI RESPONSES (mode summary)
// ============================================================
export interface SummaryAIResponse {
  target: string | null;
  key_variables: KeyVariable[];
  insights: string[];
  ai_summary: string | null;
  mode: 'summary';
  model_used: string;
  raw_interpretation?: string;
  warning?: string;
}

// ============================================================
// FULL RESPONSE (POST /analyze/full)
// ============================================================
export interface FullResponse {
  meta: {
    filename: string;
    mode: 'full';
  };
  data: {
    dataset_info: DatasetInfo;
    statistics: StatisticsData;
    correlations: CorrelationsResult;
    warnings: string[];
  };
  ai: FullAIResponse | null;
}

// ============================================================
// SUMMARY RESPONSE (POST /analyze/summary)
// ============================================================
export interface SummaryResponse {
  meta: {
    filename: string;
    mode: 'summary';
  };
  data: {
    dataset_info: DatasetInfo;
    target: string | null;
    key_variables: KeyVariable[];
    warnings: string[];
    analysis_summary?: {
      nb_key_variables: number;
      most_influential: KeyVariable | null;
    };
  };
  ai: SummaryAIResponse | null;
}
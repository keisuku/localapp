import type { ModuleDefinition } from '@/core/types/module';
import { fields, statuses, defaultStatus, version } from './schema';
import { sampleData } from './sampleData';
import { scoring } from './scoring';
import { views } from './views';
import { labels } from './labels';

const module: ModuleDefinition = {
  id: 'insurance',
  version,
  fields,
  statuses,
  defaultStatus,
  views,
  labels,
  scoring,
  sampleData,
};

export default module;

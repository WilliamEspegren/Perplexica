import configManager from './index';
import { ConfigModelProvider } from './types';

export const getConfiguredModelProviders = (): ConfigModelProvider[] => {
  return configManager.getConfig('modelProviders', []);
};

export const getConfiguredModelProviderById = (
  id: string,
): ConfigModelProvider | undefined => {
  return getConfiguredModelProviders().find((p) => p.id === id) ?? undefined;
};

export const getSearxngURL = () =>
  configManager.getConfig('search.searxngURL', '');

export const getSearchProvider = (): 'searxng' | 'seltz' =>
  configManager.getConfig('search.searchProvider', 'searxng') === 'seltz'
    ? 'seltz'
    : 'searxng';

export const getSeltzApiKey = () =>
  String(configManager.getConfig('search.seltzApiKey', '') || '');

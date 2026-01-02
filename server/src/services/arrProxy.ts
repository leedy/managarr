import axios, { AxiosRequestConfig, Method } from 'axios';
import { Instance } from '../models/Instance.js';

export interface ProxyResult {
  success: boolean;
  data?: unknown;
  status?: number;
  error?: string;
}

export async function proxyToArr(
  instanceId: string,
  path: string,
  method: Method = 'GET',
  data?: unknown
): Promise<ProxyResult> {
  try {
    const instance = await Instance.findById(instanceId);
    if (!instance) {
      return { success: false, error: 'Instance not found', status: 404 };
    }

    if (!instance.isEnabled) {
      return { success: false, error: 'Instance is disabled', status: 400 };
    }

    const baseUrl = instance.url.replace(/\/$/, '');
    const apiPath = path.startsWith('/') ? path : `/${path}`;

    const config: AxiosRequestConfig = {
      method,
      url: `${baseUrl}/api/v3${apiPath}`,
      headers: {
        'X-Api-Key': instance.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
      };
    }
    return { success: false, error: 'Proxy request failed', status: 500 };
  }
}

export async function proxyToPlex(
  instanceId: string,
  path: string,
  method: Method = 'GET',
  data?: unknown
): Promise<ProxyResult> {
  try {
    const instance = await Instance.findById(instanceId);
    if (!instance) {
      return { success: false, error: 'Instance not found', status: 404 };
    }

    if (instance.type !== 'plex') {
      return { success: false, error: 'Not a Plex instance', status: 400 };
    }

    if (!instance.isEnabled) {
      return { success: false, error: 'Instance is disabled', status: 400 };
    }

    const baseUrl = instance.url.replace(/\/$/, '');
    const apiPath = path.startsWith('/') ? path : `/${path}`;

    const config: AxiosRequestConfig = {
      method,
      url: `${baseUrl}${apiPath}`,
      headers: {
        'X-Plex-Token': instance.apiKey,
        Accept: 'application/json',
      },
      timeout: 30000,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
      };
    }
    return { success: false, error: 'Proxy request failed', status: 500 };
  }
}

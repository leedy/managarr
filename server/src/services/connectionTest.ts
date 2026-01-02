import axios from 'axios';
import { InstanceType } from '../models/Instance.js';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  version?: string;
  error?: string;
}

export async function testConnection(
  type: InstanceType,
  url: string,
  apiKey: string
): Promise<ConnectionTestResult> {
  const baseUrl = url.replace(/\/$/, '');

  try {
    switch (type) {
      case 'sonarr':
      case 'radarr':
        return await testArrConnection(baseUrl, apiKey);
      case 'plex':
        return await testPlexConnection(baseUrl, apiKey);
      default:
        return { success: false, message: 'Unknown instance type' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: 'Connection failed', error: message };
  }
}

async function testArrConnection(url: string, apiKey: string): Promise<ConnectionTestResult> {
  try {
    const response = await axios.get(`${url}/api/v3/system/status`, {
      headers: { 'X-Api-Key': apiKey },
      timeout: 10000,
    });

    return {
      success: true,
      message: 'Connection successful',
      version: response.data.version,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid API key' };
      }
      if (error.code === 'ECONNREFUSED') {
        return { success: false, message: 'Connection refused - check URL' };
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return { success: false, message: 'Connection timed out' };
      }
    }
    throw error;
  }
}

async function testPlexConnection(url: string, token: string): Promise<ConnectionTestResult> {
  try {
    const response = await axios.get(`${url}/identity`, {
      headers: {
        'X-Plex-Token': token,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const machineId = response.data.MediaContainer?.machineIdentifier;
    const version = response.data.MediaContainer?.version;

    return {
      success: true,
      message: `Connected to Plex server${machineId ? ` (${machineId.slice(0, 8)}...)` : ''}`,
      version,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid Plex token' };
      }
      if (error.code === 'ECONNREFUSED') {
        return { success: false, message: 'Connection refused - check URL' };
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return { success: false, message: 'Connection timed out' };
      }
    }
    throw error;
  }
}

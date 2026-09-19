/**
 * API Service for LettuceGrow
 * Handles all API communication with the Laravel backend
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  code?: string; // Error code for specific error types
  data?: T;
  user?: T;
  token?: string;
}

export interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * API Request Handler
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const { token, headers: customHeaders, ...fetchOptions } = options;

  const isFormData = fetchOptions.body instanceof FormData;

  const headers: HeadersInit = {
    Accept: 'application/json',
    ...customHeaders,
  };

  if (!isFormData && !(customHeaders as any)?.['Content-Type']) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}/api${endpoint}`;

  try {
    let body: any = undefined;

    if (fetchOptions.method !== 'GET' && fetchOptions.body) {
      body = isFormData ? fetchOptions.body : JSON.stringify(fetchOptions.body);
    }

    // Log API request details for profile updates
    if (endpoint.includes('/profile/') && fetchOptions.method === 'PUT') {
      console.log('🌐 [API REQUEST] Making HTTP request');
      console.log('   URL:', url);
      console.log('   Method:', fetchOptions.method || 'GET');
      console.log('   Headers:', JSON.stringify(headers, null, 2));
      if (body && !isFormData) {
        console.log('   Body:', body);
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body,
    });

    // Log API response details for profile updates
    if (endpoint.includes('/profile/') && fetchOptions.method === 'PUT') {
      console.log('📥 [API RESPONSE] Received response');
      console.log('   Status:', response.status, response.statusText);
      console.log('   OK:', response.ok);
      console.log('   Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    }

    const responseData: ApiResponse<T> = await response.json();
    
    // Log response data for profile updates
    if (endpoint.includes('/profile/') && fetchOptions.method === 'PUT') {
      console.log('📄 [API RESPONSE] Response data:', JSON.stringify(responseData, null, 2));
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || responseData.error || 'Request failed',
        errors: responseData.errors,
      };
    }

    return responseData;
  } catch (error: any) {
    // Silently handle errors - they're returned in the response
    return {
      success: false,
      error: error.message || 'Network error. Please try again.',
    };
  }
};

/**
 * GET Request
 */
export const apiGet = async <T = any>(
  endpoint: string,
  token?: string
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'GET',
    token,
  });
};

/**
 * POST Request
 */
export const apiPost = async <T = any>(
  endpoint: string,
  body: any,
  token?: string
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body,
    token,
  });
};

/**
 * PUT Request
 */
export const apiPut = async <T = any>(
  endpoint: string,
  body: any,
  token?: string
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body,
    token,
  });
};

/**
 * DELETE Request
 */
export const apiDelete = async <T = any>(
  endpoint: string,
  token?: string
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    token,
  });
};

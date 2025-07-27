import { renderHook, act } from '@testing-library/react';
import { useLoading } from '../useLoading';

describe('useLoading', () => {
  it('initializes with default loading state', () => {
    const { result } = renderHook(() => useLoading());
    
    expect(result.current.isLoading).toBe(false);
  });

  it('initializes with custom loading state', () => {
    const { result } = renderHook(() => useLoading(true));
    
    expect(result.current.isLoading).toBe(true);
  });

  it('starts and stops loading', () => {
    const { result } = renderHook(() => useLoading());
    
    act(() => {
      result.current.startLoading();
    });
    
    expect(result.current.isLoading).toBe(true);
    
    act(() => {
      result.current.stopLoading();
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('handles async operations with withLoading', async () => {
    const { result } = renderHook(() => useLoading());
    
    const asyncOperation = jest.fn().mockResolvedValue('success');
    
    const operationResult = await act(async () => {
      return await result.current.withLoading(asyncOperation);
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(operationResult).toBe('success');
    expect(asyncOperation).toHaveBeenCalledTimes(1);
  });

  it('handles async operation errors with withLoading', async () => {
    const { result } = renderHook(() => useLoading());
    
    const error = new Error('Test error');
    const asyncOperation = jest.fn().mockRejectedValue(error);
    
    await act(async () => {
      try {
        await result.current.withLoading(asyncOperation);
      } catch (e) {
        expect(e).toBe(error);
      }
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(asyncOperation).toHaveBeenCalledTimes(1);
  });

  it('ensures loading is stopped even if async operation throws', async () => {
    const { result } = renderHook(() => useLoading());
    
    const asyncOperation = jest.fn().mockRejectedValue(new Error('Test error'));
    
    await act(async () => {
      try {
        await result.current.withLoading(asyncOperation);
      } catch (e) {
        // Expected to throw
      }
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('maintains stable function references', () => {
    const { result, rerender } = renderHook(() => useLoading());
    
    const initialStartLoading = result.current.startLoading;
    const initialStopLoading = result.current.stopLoading;
    const initialWithLoading = result.current.withLoading;
    
    rerender();
    
    expect(result.current.startLoading).toBe(initialStartLoading);
    expect(result.current.stopLoading).toBe(initialStopLoading);
    expect(result.current.withLoading).toBe(initialWithLoading);
  });
});
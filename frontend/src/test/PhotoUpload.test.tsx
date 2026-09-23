import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoUpload } from '../components/ui/PhotoUpload';
import * as uploadsApi from '../services/api/uploads';
import { apiClient } from '../services/api/client';

describe('PhotoUpload Component — Authenticated Signed Cloudinary Upload', () => {
  const mockOnChange = vi.fn();

  const mockSignatureResponse: uploadsApi.UploadSignatureResponse = {
    signature: 'mock_server_generated_signature_hex',
    timestamp: 1711111111,
    apiKey: 'mock_cloudinary_api_key_123',
    cloudName: 'test-cloud-name',
    folder: 'creator-connect/profiles/c1000000-0000-4000-8000-000000000001',
    publicId: 'e8d6978f-6ca3-4d40-bb78-b1184a441315',
    public_id: 'e8d6978f-6ca3-4d40-bb78-b1184a441315',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('9. rejects invalid file types (MIME validation) and does not invoke signature or Cloudinary', async () => {
    const signatureSpy = vi.spyOn(uploadsApi, 'getUploadSignature');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <PhotoUpload
        value={null}
        onChange={mockOnChange}
        storagePath="creators/test-user/avatar"
      />
    );

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const invalidFile = new File(['plain-text-content'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Please select a JPG, PNG, WEBP, or GIF image\./i);
    });

    expect(signatureSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('10. rejects files larger than 5MB and does not invoke signature or Cloudinary', async () => {
    const signatureSpy = vi.spyOn(uploadsApi, 'getUploadSignature');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <PhotoUpload
        value={null}
        onChange={mockOnChange}
        storagePath="creators/test-user/avatar"
      />
    );

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Image size must be less than 5MB\./i);
    });

    expect(signatureSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('1. requests signature BEFORE Cloudinary upload occurs in chronological sequence', async () => {
    const callOrder: string[] = [];

    vi.spyOn(uploadsApi, 'getUploadSignature').mockImplementation(async () => {
      callOrder.push('signature_requested');
      return mockSignatureResponse;
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callOrder.push('cloudinary_uploaded');
      return {
        ok: true,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/test-cloud-name/image/upload/v1/pic.jpg',
        }),
      } as unknown as Response;
    });

    render(<PhotoUpload value={null} onChange={mockOnChange} />);

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const file = new File(['valid-image-data'], 'photo.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        'https://res.cloudinary.com/test-cloud-name/image/upload/v1/pic.jpg'
      );
    });

    expect(callOrder).toEqual(['signature_requested', 'cloudinary_uploaded']);
  });

  it('2. signature request contains authenticated API request behavior consistent with frontend API client', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockSignatureResponse,
    } as any);

    const result = await uploadsApi.getUploadSignature();

    expect(postSpy).toHaveBeenCalledWith('/uploads/signature');
    expect(result).toEqual(mockSignatureResponse);
  });

  it('3. & 4. constructs Cloudinary request with signed parameters and WITHOUT upload_preset or API secret', async () => {
    const expectedSecureUrl =
      'https://res.cloudinary.com/test-cloud-name/image/upload/v1/sample.jpg';

    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody: FormData | null = null;

    vi.spyOn(uploadsApi, 'getUploadSignature').mockResolvedValue(mockSignatureResponse);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = url.toString();
      capturedMethod = init?.method || '';
      capturedBody = init?.body as FormData;

      return {
        ok: true,
        json: async () => ({
          secure_url: expectedSecureUrl,
        }),
      } as unknown as Response;
    });

    render(<PhotoUpload value={null} onChange={mockOnChange} />);

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const validFile = new File(['image-bytes'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expectedSecureUrl);
    });

    expect(capturedUrl).toBe('https://api.cloudinary.com/v1_1/test-cloud-name/image/upload');
    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toBeInstanceOf(FormData);

    const formData = capturedBody as unknown as FormData;

    // 3. Cloudinary request contains signed parameters:
    expect(formData.get('file')).toBe(validFile);
    expect(formData.get('api_key')).toBe(mockSignatureResponse.apiKey);
    expect(formData.get('timestamp')).toBe(String(mockSignatureResponse.timestamp));
    expect(formData.get('signature')).toBe(mockSignatureResponse.signature);
    expect(formData.get('folder')).toBe(mockSignatureResponse.folder);
    expect(formData.get('public_id')).toBe(mockSignatureResponse.publicId);

    // 4. Cloudinary request does NOT contain upload_preset or API secret:
    expect(formData.get('upload_preset')).toBeNull();
    expect(formData.get('api_secret')).toBeNull();
    expect(formData.get('CLOUDINARY_API_SECRET')).toBeNull();
  });

  it('5. signature failure prevents Cloudinary upload completely and displays error', async () => {
    vi.spyOn(uploadsApi, 'getUploadSignature').mockRejectedValue(
      new Error('Rate limit exceeded: Too many upload signature requests.')
    );
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<PhotoUpload value={null} onChange={mockOnChange} />);

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const validFile = new File(['image-bytes'], 'avatar.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/Too many upload signature requests/i);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('6. Cloudinary failure displays existing appropriate error state and does not call onChange', async () => {
    vi.spyOn(uploadsApi, 'getUploadSignature').mockResolvedValue(mockSignatureResponse);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: 'Cloudinary quota exceeded' },
      }),
    } as unknown as Response);

    render(<PhotoUpload value="https://existing.com/old-avatar.jpg" onChange={mockOnChange} />);

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const validFile = new File(['image-bytes'], 'avatar.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Cloudinary quota exceeded/i)).toBeInTheDocument();
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('7. successful upload calls onChange with secure_url', async () => {
    const expectedUrl =
      'https://res.cloudinary.com/test-cloud-name/image/upload/v1/uploaded-photo.webp';

    vi.spyOn(uploadsApi, 'getUploadSignature').mockResolvedValue(mockSignatureResponse);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: expectedUrl,
      }),
    } as unknown as Response);

    render(<PhotoUpload value={null} onChange={mockOnChange} />);

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const validFile = new File(['bytes'], 'avatar.webp', { type: 'image/webp' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expectedUrl);
    });
  });

  it('8. malformed Cloudinary response is handled safely without crashing or calling onChange', async () => {
    vi.spyOn(uploadsApi, 'getUploadSignature').mockResolvedValue(mockSignatureResponse);

    // Response with invalid JSON
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Unexpected token < in JSON at position 0');
      },
    } as unknown as Response);

    render(<PhotoUpload value={null} onChange={mockOnChange} />);

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const file1 = new File(['bytes'], 'test1.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file1] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Malformed response received from Cloudinary\./i
      );
    });
    expect(mockOnChange).not.toHaveBeenCalled();

    // Response with missing secure_url
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' }), // No secure_url
    } as unknown as Response);

    const file2 = new File(['bytes'], 'test2.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file2] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Upload succeeded but no secure URL was returned\./i
      );
    });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('allows removing an existing photo and calls onChange(null)', () => {
    render(
      <PhotoUpload
        value="https://res.cloudinary.com/test-cloud-name/image/upload/v1/avatar.jpg"
        onChange={mockOnChange}
      />
    );

    const removeButton = screen.getByRole('button', { name: /Remove photo/i });
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });
});

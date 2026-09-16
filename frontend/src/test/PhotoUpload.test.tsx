import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoUpload } from '../components/ui/PhotoUpload';

describe('PhotoUpload Component — Cloudinary Direct Unsigned Upload', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid file types and does not invoke fetch or onChange', async () => {
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
      expect(screen.getByText(/Please select a JPG, PNG, WEBP, or GIF image\./i)).toBeInTheDocument();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('rejects files larger than 5MB and does not invoke fetch or onChange', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <PhotoUpload
        value={null}
        onChange={mockOnChange}
        storagePath="creators/test-user/avatar"
      />
    );

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    // 6 MB dummy file
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Image size must be less than 5MB\./i)).toBeInTheDocument();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('uploads valid image to Cloudinary unsigned endpoint with FormData containing file and upload_preset', async () => {
    const expectedSecureUrl = 'https://res.cloudinary.com/xinpxb9h/image/upload/v1234567890/creator-connect/profile-images/sample.jpg';

    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody: FormData | null = null;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = url.toString();
      capturedMethod = init?.method || '';
      capturedBody = init?.body as FormData;

      return {
        ok: true,
        json: async () => ({
          secure_url: expectedSecureUrl,
          public_id: 'auto_generated_id_123',
        }),
      } as unknown as Response;
    });

    render(
      <PhotoUpload
        value={null}
        onChange={mockOnChange}
        storagePath="creators/test-user/avatar"
      />
    );

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const validFile = new File(['dummy-image-binary'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expectedSecureUrl);
    });

    // Verify endpoint and method
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(capturedUrl).toBe('https://api.cloudinary.com/v1_1/xinpxb9h/image/upload');
    expect(capturedMethod).toBe('POST');

    // Verify FormData contents
    expect(capturedBody).toBeInstanceOf(FormData);
    const formData = capturedBody as unknown as FormData;
    expect(formData.get('upload_preset')).toBe('creator_connect_profile_images');
    expect(formData.get('file')).toBe(validFile);

    // CRITICAL: Ensure no client-controlled folder or secrets are in FormData
    expect(formData.get('folder')).toBeNull();
    expect(formData.get('api_secret')).toBeNull();
    expect(formData.get('signature')).toBeNull();
  });


  it('displays user-visible error and NEVER calls onChange with a blob: URL when Cloudinary responds with an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: 'Cloudinary quota exceeded' },
      }),
    } as unknown as Response);

    render(
      <PhotoUpload
        value="https://existing.com/old-avatar.jpg"
        onChange={mockOnChange}
        storagePath="creators/test-user/avatar"
      />
    );

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const validFile = new File(['dummy-image-binary'], 'avatar.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Cloudinary quota exceeded/i)).toBeInTheDocument();
    });

    // Ensure onChange was NEVER called, specifically not with blob: or null
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('displays user-visible error when network fails completely', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    render(
      <PhotoUpload
        value={null}
        onChange={mockOnChange}
        storagePath="creators/test-user/avatar"
      />
    );

    const input = document.getElementById('photo-upload-input') as HTMLInputElement;
    const validFile = new File(['dummy-image-binary'], 'avatar.webp', { type: 'image/webp' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Network offline/i)).toBeInTheDocument();
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('allows removing an existing photo and calls onChange(null)', () => {
    render(
      <PhotoUpload
        value="https://res.cloudinary.com/xinpxb9h/image/upload/v1/avatar.jpg"
        onChange={mockOnChange}
        storagePath="creators/test-user/avatar"
      />
    );

    const removeButton = screen.getByRole('button', { name: /Remove photo/i });
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });
});

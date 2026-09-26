import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { Footer } from '../../components/layout/Footer';
import { PublicLayout } from '../../components/layout/PublicLayout';

// Mock Firebase Client SDK
vi.mock('../../config/firebase', () => ({
  auth: { currentUser: null },
  default: {},
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('../../services/api/auth', () => ({
  authApi: {
    getMe: vi.fn(),
    provision: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
  },
}));

vi.mock('../../services/api/creators', () => ({
  listCreators: vi.fn().mockResolvedValue({ creators: [], pagination: { total: 0 } }),
  getPublicCreatorProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/api/savedCreators', () => ({
  getSavedCreatorIds: vi.fn().mockResolvedValue([]),
  saveCreator: vi.fn(),
  unsaveCreator: vi.fn(),
}));

const renderRoute = (route: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('CreatorSpot Public Pages & Legal Documentation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. /privacy route renders Privacy Policy with required statutory and product invariants', () => {
    renderRoute('/privacy');

    expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByText(/Effective Date:/i)).toHaveTextContent(/October 8, 2026/i);

    // Support email
    const emailLinks = screen.getAllByRole('link', { name: /creatorspot08@gmail\.com/i });
    expect(emailLinks.length).toBeGreaterThan(0);

    // 18+ requirement
    expect(screen.getByText(/19\. Children's Information/i)).toBeInTheDocument();
    expect(screen.getByText(/CreatorSpot is intended for people 18 years of age or older/i)).toBeInTheDocument();

    // 60-day inquiry expiration
    expect(
      screen.getAllByText(/An unanswered inquiry currently expires automatically after 60 days/i).length
    ).toBeGreaterThan(0);

    // 30-day account deletion grace period
    expect(
      screen.getByText(/provides a 30-day period following deactivation before permanent deletion/i)
    ).toBeInTheDocument();

    // 180-day email reservation
    expect(
      screen.getByText(/SHA-256 hash of the normalized email address and reserves the corresponding identifier for 180 days/i)
    ).toBeInTheDocument();

    // Footer is rendered
    expect(screen.getByRole('contentinfo', { name: /CreatorSpot Public Footer/i })).toBeInTheDocument();
  });

  it('2. /terms route renders Terms & Conditions with required business and legal invariants', () => {
    renderRoute('/terms');

    expect(screen.getByRole('heading', { level: 1, name: /Terms & Conditions/i })).toBeInTheDocument();
    expect(screen.getByText(/Effective Date:/i)).toHaveTextContent(/October 8, 2026/i);

    // 18+ requirement
    expect(screen.getByText(/You must be at least 18 years old to use CreatorSpot/i)).toBeInTheDocument();

    // 60-day inquiry expiration
    expect(
      screen.getByText(/An unanswered inquiry automatically expires after 60 days from creation/i)
    ).toBeInTheDocument();

    // 30-day grace period
    expect(
      screen.getByText(/currently provides a 30-day reactivation period following deactivation/i)
    ).toBeInTheDocument();

    // India governing law & no specific court invented
    expect(
      screen.getByText(/These Terms are intended to be governed by the laws applicable in India/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The specific court\/jurisdiction provision will be finalized when the operator's applicable jurisdiction is determined/i)
    ).toBeInTheDocument();

    // Support email
    const emailLinks = screen.getAllByRole('link', { name: /creatorspot08@gmail\.com/i });
    expect(emailLinks.length).toBeGreaterThan(0);

    // What CreatorSpot does not provide
    expect(screen.getByRole('heading', { name: /2\. What CreatorSpot Does Not Provide/i })).toBeInTheDocument();
  });

  it('3. /contact route renders contact categories and support email', () => {
    renderRoute('/contact');

    expect(screen.getByRole('heading', { level: 1, name: /Contact CreatorSpot/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /General Support/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Privacy & Data Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Account Issues/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Business & Creator Feedback/i })).toBeInTheDocument();

    const emails = screen.getAllByRole('link', { name: /creatorspot08@gmail\.com/i });
    expect(emails.length).toBeGreaterThanOrEqual(3);
  });

  it('4. /about route renders platform purpose and non-goal boundaries', () => {
    renderRoute('/about');

    expect(screen.getByRole('heading', { level: 1, name: /About CreatorSpot/i })).toBeInTheDocument();
    expect(
      screen.getAllByText(/structured discovery and collaboration platform connecting businesses and creators across India/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/CreatorSpot does not process payments, manage campaigns, handle contracts, or provide in-app messaging/i)
    ).toBeInTheDocument();
  });

  it('5. /how-it-works route renders both Business and Creator flows with toggle', () => {
    renderRoute('/how-it-works');

    expect(screen.getByRole('heading', { level: 1, name: /How CreatorSpot Works/i })).toBeInTheDocument();

    const mainArea = screen.getByRole('main');

    // Default: Business tab
    expect(within(mainArea).getByRole('heading', { level: 2, name: /FOR BUSINESSES/i })).toBeInTheDocument();
    expect(within(mainArea).getByRole('heading', { level: 3, name: /Discover creators/i })).toBeInTheDocument();
    expect(within(mainArea).getByRole('heading', { level: 3, name: /Send an inquiry/i })).toBeInTheDocument();
    expect(within(mainArea).getByRole('heading', { level: 3, name: /Collaborate externally/i })).toBeInTheDocument();

    // Switch to Creator tab
    const creatorTabBtn = screen.getByRole('button', { name: /For Creators/i });
    fireEvent.click(creatorTabBtn);

    expect(within(mainArea).getByRole('heading', { level: 2, name: /FOR CREATORS/i })).toBeInTheDocument();
    expect(within(mainArea).getByRole('heading', { level: 3, name: /Create your profile/i })).toBeInTheDocument();
    expect(within(mainArea).getByRole('heading', { level: 3, name: /Get discovered/i })).toBeInTheDocument();
    expect(within(mainArea).getByRole('heading', { level: 3, name: /Choose what to accept/i })).toBeInTheDocument();
  });

  it('6. Footer renders all required links and bottom copyright', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const footer = screen.getByRole('contentinfo', { name: /CreatorSpot Public Footer/i });
    expect(footer).toBeInTheDocument();

    // Logo & Mission
    expect(within(footer).getByText('CreatorSpot')).toBeInTheDocument();
    expect(
      within(footer).getByText(/The structured collaboration platform connecting Businesses and Creators across India/i)
    ).toBeInTheDocument();

    // Links Verification
    expect(within(footer).getByRole('link', { name: /Explore Creators/i })).toHaveAttribute('href', '/creators');
    expect(within(footer).getByRole('link', { name: /How It Works/i })).toHaveAttribute('href', '/how-it-works');
    expect(within(footer).getByRole('link', { name: /About CreatorSpot/i })).toHaveAttribute('href', '/about');
    expect(within(footer).getByRole('link', { name: /Join as Creator/i })).toHaveAttribute('href', '/signup');
    expect(within(footer).getByRole('link', { name: /Creator Login/i })).toHaveAttribute('href', '/login');
    expect(within(footer).getByRole('link', { name: /Discover Creators/i })).toHaveAttribute('href', '/creators');
    expect(within(footer).getByRole('link', { name: /Business Login/i })).toHaveAttribute('href', '/login');
    expect(within(footer).getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy');
    expect(within(footer).getByRole('link', { name: /Terms & Conditions/i })).toHaveAttribute('href', '/terms');
    expect(within(footer).getByRole('link', { name: /Contact Us/i })).toHaveAttribute('href', '/contact');

    // Bottom Bar
    expect(within(footer).getByText(/© 2026 CreatorSpot\. All rights reserved\./i)).toBeInTheDocument();
    expect(within(footer).getByText(/Independently operated\./i)).toBeInTheDocument();
  });

  it('7. PublicLayout renders PublicHeader, main content, and Footer', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <PublicLayout>
            <div>Child Page Content</div>
          </PublicLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Child Page Content')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: /CreatorSpot Public Footer/i })).toBeInTheDocument();
  });

  it('8. Auth and Dashboard routes do NOT render the public footer', () => {
    renderRoute('/login');

    // On login page, the public footer must NOT be rendered
    expect(screen.queryByRole('contentinfo', { name: /CreatorSpot Public Footer/i })).not.toBeInTheDocument();
  });
});

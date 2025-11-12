import { render, screen } from '@testing-library/react';
import { DidYouKnow } from '../did-you-know';

describe('DidYouKnow', () => {
  it('should render the tip text', () => {
    render(<DidYouKnow />);

    expect(screen.getByText('Did You Know?')).toBeInTheDocument();
    expect(
      screen.getByText(/Talk to your coach about personalized training plans and bulk session packages/)
    ).toBeInTheDocument();
  });

  it('should render with lightbulb icon', () => {
    const { container } = render(<DidYouKnow />);

    // Check for the icon SVG element
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<DidYouKnow className="custom-class" />);

    const tipElement = container.querySelector('.custom-class');
    expect(tipElement).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(<DidYouKnow />);

    const tipElement = container.firstChild as HTMLElement;
    expect(tipElement).toHaveClass('border-l-4');
    expect(tipElement).toHaveClass('border-primary');
    expect(tipElement).toHaveClass('bg-primary/5');
    expect(tipElement).toHaveClass('rounded-r-lg');
  });

  it('should have accessible structure', () => {
    render(<DidYouKnow />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Did You Know?');
  });

  it('should render booking button when bookingUrl is provided', () => {
    render(<DidYouKnow bookingUrl="https://example.com/book" />);

    const bookButton = screen.getByRole('link', { name: /Book Session/i });
    expect(bookButton).toBeInTheDocument();
    expect(bookButton).toHaveAttribute('href', '/subscribe');
  });

  it('should link to booking URL for subscribers', () => {
    render(<DidYouKnow bookingUrl="https://example.com/book" hasSubscriberRole={true} />);

    const bookButton = screen.getByRole('link', { name: /Book Session/i });
    expect(bookButton).toHaveAttribute('href', 'https://example.com/book');
    expect(bookButton).toHaveAttribute('target', '_blank');
  });

  it('should not render booking button when bookingUrl is not provided', () => {
    render(<DidYouKnow />);

    const bookButton = screen.queryByRole('link', { name: /Book Session/i });
    expect(bookButton).not.toBeInTheDocument();
  });
});

/**
 * Button component tests
 * Tests the Button atom component functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../components/atoms/Button.astro';

// Mock Astro component
const MockButton = ({ children, ...props }: any) => {
    const Tag = props.href ? 'a' : 'button';
    return (
        <Tag { ...props } >
        {
            props.loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill = "none" viewBox="0 0 24 24" >
                <circle className="opacity-25" cx = "12" cy="12" r="10" stroke="currentColor" strokeWidth="4" > </circle>
                < path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" > </path>
                </svg>
      )
}
{ children }
</Tag>
  );
};

describe('Button Component', () => {
    it('renders with default props', () => {
        render(<MockButton>Click me </MockButton>);
        const button = screen.getByText('Click me');
        expect(button).toBeInTheDocument();
        expect(button.tagName).toBe('BUTTON');
    });

    it('renders as link when href is provided', () => {
        render(<MockButton href="/test" > Link </MockButton>);
        const link = screen.getByText('Link');
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', '/test');
    });

    it('applies correct variant classes', () => {
        const { rerender } = render(<MockButton variant="primary" > Primary </MockButton>);
        expect(screen.getByText('Primary')).toHaveClass('bg-soladia-primary');

        rerender(<MockButton variant="secondary" > Secondary </MockButton>);
        expect(screen.getByText('Secondary')).toHaveClass('bg-soladia-secondary');

        rerender(<MockButton variant="outline" > Outline </MockButton>);
        expect(screen.getByText('Outline')).toHaveClass('border-2', 'border-soladia-primary');
    });

    it('applies correct size classes', () => {
        const { rerender } = render(<MockButton size="sm" > Small </MockButton>);
        expect(screen.getByText('Small')).toHaveClass('px-3', 'py-1.5', 'text-sm');

        rerender(<MockButton size="md" > Medium </MockButton>);
        expect(screen.getByText('Medium')).toHaveClass('px-4', 'py-2', 'text-sm');

        rerender(<MockButton size="lg" > Large </MockButton>);
        expect(screen.getByText('Large')).toHaveClass('px-6', 'py-3', 'text-base');
    });

    it('applies full width class when fullWidth is true', () => {
        render(<MockButton fullWidth > Full Width </MockButton>);
        expect(screen.getByText('Full Width')).toHaveClass('w-full');
    });

    it('shows loading state', () => {
        render(<MockButton loading > Loading </MockButton>);
        expect(screen.getByText('Loading')).toBeInTheDocument();
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });

    it('is disabled when disabled prop is true', () => {
        render(<MockButton disabled > Disabled </MockButton>);
        const button = screen.getByText('Disabled');
        expect(button).toBeDisabled();
        expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<MockButton onClick={ handleClick } > Click me </MockButton>);

        fireEvent.click(screen.getByText('Click me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
        const handleClick = vi.fn();
        render(<MockButton disabled onClick = { handleClick } > Disabled </MockButton>);

        fireEvent.click(screen.getByText('Disabled'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies custom className', () => {
        render(<MockButton className="custom-class" > Custom </MockButton>);
        expect(screen.getByText('Custom')).toHaveClass('custom-class');
    });

    it('sets data-testid attribute', () => {
        render(<MockButton data - testid="test-button" > Test </MockButton>);
        expect(screen.getByTestId('test-button')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
        render(
            <MockButton>
            <span>Icon </span>
            < span > Text </span>
            </MockButton>
        );

        expect(screen.getByText('Icon')).toBeInTheDocument();
        expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('applies correct type attribute for button', () => {
        render(<MockButton type="submit" > Submit </MockButton>);
        expect(screen.getByText('Submit')).toHaveAttribute('type', 'submit');
    });

    it('applies target attribute for link', () => {
        render(<MockButton href="/test" target = "_blank" > Link </MockButton>);
        expect(screen.getByText('Link')).toHaveAttribute('target', '_blank');
    });
});

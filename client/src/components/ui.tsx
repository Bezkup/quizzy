import type {ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode} from 'react';

// ---- Card ----

export function Card({children, style, centered}: {
    children: ReactNode;
    style?: CSSProperties;
    centered?: boolean;
}) {
    return (
        <div style={{
            background: '#1a1a3e',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            textAlign: centered ? 'center' : undefined,
            ...style,
        }}>
            {children}
        </div>
    );
}

// ---- Input ----

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { fullWidth?: boolean }) {
    const {fullWidth = true, style, ...rest} = props;
    return (
        <input
            style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '2px solid #333366',
                background: '#0f0f23',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                width: fullWidth ? '100%' : undefined,
                ...style,
            }}
            {...rest}
        />
    );
}

// ---- Button variants ----

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost';

const variantStyles: Record<ButtonVariant, CSSProperties> = {
    primary: {background: '#6c5ce7', color: '#fff', border: 'none'},
    success: {background: '#00b894', color: '#fff', border: 'none'},
    danger: {background: 'transparent', color: '#d63031', border: '2px solid #d63031'},
    ghost: {background: 'transparent', color: '#b2bec3', border: '2px solid #636e72'},
};

export function Button({variant = 'primary', fullWidth, style, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    fullWidth?: boolean;
}) {
    return (
        <button
            style={{
                padding: '0.75rem 1.2rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: props.disabled ? 'not-allowed' : 'pointer',
                opacity: props.disabled ? 0.6 : 1,
                minHeight: '44px',
                width: fullWidth ? '100%' : undefined,
                ...variantStyles[variant],
                ...style,
            }}
            {...props}
        />
    );
}

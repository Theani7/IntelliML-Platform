'use client';

/**
 * ErrorAlert — consistent error display with icon, message, and optional retry.
 */

interface ErrorAlertProps {
    message: string;
    title?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export default function ErrorAlert({
    message,
    title = 'Something went wrong',
    onRetry,
    onDismiss,
}: ErrorAlertProps) {
    return (
        <div className="relative mx-auto max-w-lg bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 animate-fadeIn shadow-sm">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
                <h4 className="text-sm font-bold text-rose-800">{title}</h4>
                <p className="text-sm text-rose-600 mt-0.5">{message}</p>

                {(onRetry || onDismiss) && (
                    <div className="flex gap-2 mt-3">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-3 py-1.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Close button */}
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="flex-shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}

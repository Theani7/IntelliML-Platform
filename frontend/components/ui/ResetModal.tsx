import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface ResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ResetModal({ isOpen, onClose, onConfirm }: ResetModalProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-[#470102]/20 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#FFF7EA] border border-[#FFEDC1] p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-[#470102]"
                                >
                                    Reset Session?
                                </Dialog.Title>
                                <div className="mt-2">
                                    <p className="text-sm text-[#8A5A5A]">
                                        Are you sure you want to start over? This will clear all uploaded data, analysis results, and trained models. This action cannot be undone.
                                    </p>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-[#8A5A5A] hover:bg-[#470102]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#470102] focus-visible:ring-offset-2 transition-colors"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-lg border border-transparent bg-[#470102] px-4 py-2 text-sm font-bold text-[#FFEDC1] hover:bg-[#5D0203] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#470102] focus-visible:ring-offset-2 shadow-sm transition-all hover:shadow-md"
                                        onClick={() => {
                                            onConfirm();
                                            onClose();
                                        }}
                                    >
                                        Yes, Reset Everything
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

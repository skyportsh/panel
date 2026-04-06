export const dialogOverlayMotionClass =
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:data-[state=closed]:duration-0 motion-reduce:data-[state=open]:duration-0';

export const centeredDialogMotionClass =
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[52%] data-[state=closed]:duration-200 data-[state=open]:duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:data-[state=closed]:duration-0 motion-reduce:data-[state=open]:duration-0';

export const fullscreenDialogMotionClass =
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.985] data-[state=open]:zoom-in-[0.985] data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[4%] data-[state=closed]:duration-200 data-[state=open]:duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:data-[state=closed]:duration-0 motion-reduce:data-[state=open]:duration-0';

export const sheetMotionClass =
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-200 data-[state=open]:duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:data-[state=closed]:duration-0 motion-reduce:data-[state=open]:duration-0';

export const sheetSideMotionClass = {
    right: 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
    left: 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
    top: 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
    bottom: 'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
} as const;

import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { home, login, register } from '@/routes';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;

    useEffect(() => {
        if (!auth?.user) {
            return;
        }

        const preferred =
            typeof window !== 'undefined'
                ? localStorage.getItem('default-landing-url')
                : null;
        const target = preferred ?? '/home';

        router.visit(target, { replace: true });
    }, [auth?.user]);

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <header className="mb-6 w-full max-w-[335px] text-sm not-has-[nav]:hidden lg:max-w-4xl">
                    <nav className="flex items-center justify-end gap-4">
                        {auth.user ? (
                            <Link
                                href={home()}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Home
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                    >
                                        Register
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>
                <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                    <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
                        <div className="flex-1 rounded-br-lg rounded-bl-lg bg-white p-6 pb-12 text-[13px] leading-[20px] lg:rounded-tl-lg lg:rounded-br-none lg:p-20 dark:bg-[#161615] dark:text-[#EDEDEC]">
                            <h1 className="mb-1 text-lg font-semibold">
                                Welcome to the Altare Console
                            </h1>
                            <p className="mb-2 text-[#706f6c] dark:text-[#A1A09A]">
                                This is where you can manage your compute
                                resources, balance, game servers, and more.
                            </p>
                            <ul className="mb-4 flex flex-col lg:mb-6">
                                <li className="relative flex items-center gap-4 py-2 before:absolute before:top-1/2 before:bottom-0 before:left-[0.4rem] before:border-l before:border-[#e3e3e0] dark:before:border-[#3E3E3A]">
                                    <span className="relative bg-white py-1 dark:bg-[#161615]">
                                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#e3e3e0] bg-[#FDFDFC] shadow-[0px_0px_1px_0px_rgba(0,0,0,0.03),0px_1px_2px_0px_rgba(0,0,0,0.06)] dark:border-[#3E3E3A] dark:bg-[#161615]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#dbdbd7] dark:bg-[#3E3E3A]" />
                                        </span>
                                    </span>
                                    <span>
                                        Check out our
                                        <a
                                            href="https://docs.altare.gg"
                                            target="_blank"
                                            className="ml-1 inline-flex items-center space-x-1 font-medium text-sky-600 underline underline-offset-4 dark:text-sky-400"
                                        >
                                            <span>Documentation</span>
                                            <svg
                                                width={10}
                                                height={11}
                                                viewBox="0 0 10 11"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-2.5 w-2.5"
                                            >
                                                <path
                                                    d="M7.70833 6.95834V2.79167H3.54167M2.5 8L7.5 3.00001"
                                                    stroke="currentColor"
                                                    strokeLinecap="square"
                                                />
                                            </svg>
                                        </a>
                                    </span>
                                </li>
                                <li className="relative flex items-center gap-4 py-2 before:absolute before:top-0 before:bottom-1/2 before:left-[0.4rem] before:border-l before:border-[#e3e3e0] dark:before:border-[#3E3E3A]">
                                    <span className="relative bg-white py-1 dark:bg-[#161615]">
                                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#e3e3e0] bg-[#FDFDFC] shadow-[0px_0px_1px_0px_rgba(0,0,0,0.03),0px_1px_2px_0px_rgba(0,0,0,0.06)] dark:border-[#3E3E3A] dark:bg-[#161615]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#dbdbd7] dark:bg-[#3E3E3A]" />
                                        </span>
                                    </span>
                                    <span>
                                        Join Altare's
                                        <a
                                            href="https://discord.gg/altare"
                                            target="_blank"
                                            className="ml-1 inline-flex items-center space-x-1 font-medium text-sky-600 underline underline-offset-4 dark:text-sky-400"
                                        >
                                            <span>Discord server</span>
                                            <svg
                                                width={10}
                                                height={11}
                                                viewBox="0 0 10 11"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-2.5 w-2.5"
                                            >
                                                <path
                                                    d="M7.70833 6.95834V2.79167H3.54167M2.5 8L7.5 3.00001"
                                                    stroke="currentColor"
                                                    strokeLinecap="square"
                                                />
                                            </svg>
                                        </a>
                                    </span>
                                </li>
                            </ul>
                            <ul className="flex gap-3 text-sm leading-normal">
                                <li>
                                    <Link
                                        href={auth.user ? home() : login()}
                                        className="inline-block rounded-sm border border-black bg-[#1b1b18] px-3 py-1.5 text-sm leading-normal font-medium text-white hover:border-black hover:bg-black dark:border-[#eeeeec] dark:bg-[#eeeeec] dark:text-[#1C1C1A] dark:hover:border-white dark:hover:bg-white"
                                    >
                                        {auth.user ? 'Back to Home' : 'Log in'}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="relative -mb-px flex aspect-[335/364] w-full shrink-0 items-center justify-center overflow-hidden rounded-t-lg bg-[#eef8ff] lg:mb-0 lg:-ml-px lg:aspect-auto lg:w-[438px] lg:rounded-t-none lg:rounded-r-lg dark:bg-[#03111c]">
                            {/* 11 */}
                            <svg
                                className="relative w-[438px] max-w-none [--stroke-color:#1B1B18] dark:[--stroke-color:#7DD3FC]"
                                viewBox="0 0 440 392"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <g className="text-[#E0F2FE] opacity-100 mix-blend-normal transition-all delay-300 duration-750 dark:text-[#03111C] dark:mix-blend-normal starting:opacity-0">
                                    <mask
                                        id="path-1-mask"
                                        maskUnits="userSpaceOnUse"
                                        x="-0.328613"
                                        y="103"
                                        width="338"
                                        height="299"
                                        fill="black"
                                    >
                                        <rect
                                            fill="white"
                                            x="-0.328613"
                                            y="103"
                                            width="338"
                                            height="299"
                                        />
                                        <path d="M244.136 167.6H218.936V105.2H311.936V400.2H244.136V167.6Z" />
                                        <path d="M26.8714 167.6H1.67139V105.2H94.6714V400.2H26.8714V167.6Z" />
                                    </mask>
                                    <path
                                        d="M244.136 167.6H218.936V105.2H311.936V400.2H244.136V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M26.8714 167.6H1.67139V105.2H94.6714V400.2H26.8714V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M244.136 167.6H218.936V105.2H311.936V400.2H244.136V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-1-mask)"
                                    />
                                    <path
                                        d="M26.8714 167.6H1.67139V105.2H94.6714V400.2H26.8714V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-1-mask)"
                                    />
                                </g>

                                <g className="text-[#BAE6FD] opacity-100 mix-blend-normal transition-all delay-400 duration-750 dark:text-[#1D4ED8] starting:opacity-0 motion-safe:starting:-translate-x-[26px]">
                                    <mask
                                        id="path-2-mask"
                                        maskUnits="userSpaceOnUse"
                                        x="25.3357"
                                        y="103"
                                        width="338"
                                        height="299"
                                        fill="black"
                                    >
                                        <rect
                                            fill="white"
                                            x="25.3357"
                                            y="103"
                                            width="338"
                                            height="299"
                                        />
                                        <path d="M269.8 167.6H244.6V105.2H337.6V400.2H269.8V167.6Z" />
                                        <path d="M52.5357 167.6H27.3357V105.2H120.336V400.2H52.5357V167.6Z" />
                                    </mask>
                                    <path
                                        d="M269.8 167.6H244.6V105.2H337.6V400.2H269.8V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M52.5357 167.6H27.3357V105.2H120.336V400.2H52.5357V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M269.8 167.6H244.6V105.2H337.6V400.2H269.8V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-2-mask)"
                                    />
                                    <path
                                        d="M52.5357 167.6H27.3357V105.2H120.336V400.2H52.5357V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-2-mask)"
                                    />
                                </g>

                                <g className="text-[#7DD3FC] opacity-100 mix-blend-normal transition-all delay-400 duration-750 dark:text-[#2563EB] dark:mix-blend-normal starting:opacity-0 motion-safe:starting:-translate-x-[51px]">
                                    <mask
                                        id="path-3-mask"
                                        maskUnits="userSpaceOnUse"
                                        x="51"
                                        y="103"
                                        width="338"
                                        height="299"
                                        fill="black"
                                    >
                                        <rect
                                            fill="white"
                                            x="51"
                                            y="103"
                                            width="338"
                                            height="299"
                                        />
                                        <path d="M295.464 167.6H270.264V105.2H363.264V400.2H295.464V167.6Z" />
                                        <path d="M78.2 167.6H53V105.2H146V400.2H78.2V167.6Z" />
                                    </mask>
                                    <path
                                        d="M295.464 167.6H270.264V105.2H363.264V400.2H295.464V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M78.2 167.6H53V105.2H146V400.2H78.2V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M295.464 167.6H270.264V105.2H363.264V400.2H295.464V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-3-mask)"
                                    />
                                    <path
                                        d="M78.2 167.6H53V105.2H146V400.2H78.2V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-3-mask)"
                                    />
                                </g>

                                <g className="text-[#38BDF8] opacity-100 mix-blend-normal transition-all delay-400 duration-750 dark:text-[#38BDF8] dark:mix-blend-normal starting:opacity-0 motion-safe:starting:-translate-x-[78px]">
                                    <mask
                                        id="path-4-mask"
                                        maskUnits="userSpaceOnUse"
                                        x="76.6643"
                                        y="103"
                                        width="338"
                                        height="299"
                                        fill="black"
                                    >
                                        <rect
                                            fill="white"
                                            x="76.6643"
                                            y="103"
                                            width="338"
                                            height="299"
                                        />
                                        <path d="M321.129 167.6H295.929V105.2H388.929V400.2H321.129V167.6Z" />
                                        <path d="M103.864 167.6H78.6643V105.2H171.664V400.2H103.864V167.6Z" />
                                    </mask>
                                    <path
                                        d="M321.129 167.6H295.929V105.2H388.929V400.2H321.129V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M103.864 167.6H78.6643V105.2H171.664V400.2H103.864V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M321.129 167.6H295.929V105.2H388.929V400.2H321.129V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-4-mask)"
                                    />
                                    <path
                                        d="M103.864 167.6H78.6643V105.2H171.664V400.2H103.864V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-4-mask)"
                                    />
                                </g>

                                <g className="text-[#0EA5E9] opacity-100 mix-blend-normal transition-all delay-400 duration-750 dark:text-[#7DD3FC] dark:mix-blend-normal starting:opacity-0 motion-safe:starting:-translate-x-[102px]">
                                    <mask
                                        id="path-5-mask"
                                        maskUnits="userSpaceOnUse"
                                        x="102.329"
                                        y="103"
                                        width="338"
                                        height="299"
                                        fill="black"
                                    >
                                        <rect
                                            fill="white"
                                            x="102.329"
                                            y="103"
                                            width="338"
                                            height="299"
                                        />
                                        <path d="M346.793 167.6H321.593V105.2H414.593V400.2H346.793V167.6Z" />
                                        <path d="M129.529 167.6H104.329V105.2H197.329V400.2H129.529V167.6Z" />
                                    </mask>
                                    <path
                                        d="M346.793 167.6H321.593V105.2H414.593V400.2H346.793V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M129.529 167.6H104.329V105.2H197.329V400.2H129.529V167.6Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M346.793 167.6H321.593V105.2H414.593V400.2H346.793V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-5-mask)"
                                    />
                                    <path
                                        d="M129.529 167.6H104.329V105.2H197.329V400.2H129.529V167.6Z"
                                        stroke="var(--stroke-color)"
                                        strokeWidth="2.4"
                                        mask="url(#path-5-mask)"
                                    />
                                </g>
                            </svg>
                            <div className="absolute inset-0 rounded-t-lg lg:rounded-t-none lg:rounded-r-lg"></div>
                        </div>
                    </main>
                </div>
                <div className="hidden h-14.5 lg:block"></div>
            </div>
        </>
    );
}

export function BuildStamp() {
  const label = new Date(__BUILD_TIME__).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <p className="text-center text-xs text-gray-300 py-2" title={__BUILD_TIME__}>
      {label}
    </p>
  );
}

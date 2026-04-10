export function BottomTab() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t lg:hidden">
      <div className="flex justify-around py-2">
        <span className="text-xs">내 모임</span>
        <span className="text-xs">둘러보기</span>
        <span className="text-xs">알림</span>
        <span className="text-xs">프로필</span>
      </div>
    </nav>
  );
}

# Homebrew formula template (tap later: brew tap aledx18/craftty && brew install craftty)
#
# Flow:
# 1. Publish GitHub Release assets: craftty-darwin-arm64, craftty-darwin-x64,
#    craftty-linux-x64, craftty-linux-arm64
# 2. Fill sha256 values (shasum -a 256 dist/craftty-*)
# 3. Host this file in a tap repo, e.g. homebrew-craftty/Formula/craftty.rb

class Craftty < Formula
  desc "Terminal Minecraft launcher (TUI)"
  homepage "https://github.com/aledx18/Craftty"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/aledx18/Craftty/releases/download/v#{version}/craftty-darwin-arm64"
      sha256 "REPLACE_ME"
    end
    on_intel do
      url "https://github.com/aledx18/Craftty/releases/download/v#{version}/craftty-darwin-x64"
      sha256 "REPLACE_ME"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/aledx18/Craftty/releases/download/v#{version}/craftty-linux-arm64"
      sha256 "REPLACE_ME"
    end
    on_intel do
      url "https://github.com/aledx18/Craftty/releases/download/v#{version}/craftty-linux-x64"
      sha256 "REPLACE_ME"
    end
  end

  def install
    bin.install Dir["craftty-*"].first => "craftty"
  end

  test do
    assert_predicate bin/"craftty", :executable?
  end
end

find . | grep -Ev "(^./(\..*(/|$)|node_modules|dist)|\.(png|jpe?g|svg|woff2)$|^\.$|^\./tree.txt)" | sed -e "s/[^-][^\/]*\// |/g" -e "s/|\([^ ]\)/|- \1/" > tree.txt

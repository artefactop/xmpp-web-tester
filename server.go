package main

import (
	"github.com/codegangsta/negroni"
	"io/ioutil"
	"net/http"
)

func main() {

	mux := http.NewServeMux()

	mux.HandleFunc("/", Tester)

	n := negroni.Classic()
	n.UseHandler(mux)
	n.Run(":8080")
}

func Tester(rw http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadFile("public/xmpp_tester.html")
	if err != nil {
		rw.Write([]byte("oops"))
	}
	rw.Write(body)
}

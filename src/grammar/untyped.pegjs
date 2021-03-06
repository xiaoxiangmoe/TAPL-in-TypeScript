Start := _ commands={ term=Command _ ';' _}* $

Command := NameBind | Eval
Eval := start=@ term=Term end=@
// `ℬ x` 代表声明了全局变量 x
NameBind := 'ℬ' _ start=@ name=LowerCaseIdentifier end=@

Term := VariableTerm | AbstractionTerm | ApplicationTerm
VariableTerm := start=@ name=LowerCaseIdentifier end=@
AbstractionTerm := start=@ '\(λ' _ parameter_name=LowerCaseIdentifier _ '.' _ body=Term _ '\)' end=@
ApplicationTerm := start=@ '\(' func=Term __ argument=Term '\)' end=@

_ := '\s*'
__ := '\s+'
LowerCaseIdentifier := '[a-z]+'

Start := _ commands={ term=Command _ ';' _}* $

Command := NameBind | Eval
Eval := start=@ term=Term end=@
// ℬ x: Bool 代表声明了全局变量 x，其类型为 Bool
NameBind := start=@ 'ℬ' _ name=LowerCaseIdentifier _ ':' _ type=Type end=@

Type := ArrowType | BoolType
ArrowType := '\(' _ parameter=Type _ '→' _ body=Type _ '\)'
BoolType := @ 'Bool'

Term := IfTerm | TrueTerm | FalseTerm | VariableTerm | AbstractionTerm | ApplicationTerm
VariableTerm := start=@ name=LowerCaseIdentifier end=@
AbstractionTerm := start=@ '\(λ' _ parameter_name=LowerCaseIdentifier _ ':' _ parameter_type=Type _ '.' _ body=Term _ '\)' end=@
ApplicationTerm := start=@ '\(' func=Term __ argument=Term '\)' end=@
IfTerm := start=@ 'if' __ condition=Term __ 'then' __ then=Term __ 'else' __ else=Term end=@
TrueTerm := start=@ 'true' end=@
FalseTerm := start=@ 'false' end=@

_ := '\s*'
__ := '\s+'
LowerCaseIdentifier := '[a-z]+'
